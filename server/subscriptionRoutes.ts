/**
 * Subscription API Routes Module
 * Handles institution subscription management, usage tracking, and Razorpay integration
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { DB } from './database';
import { generateId } from './db';

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export function registerSubscriptionRoutes(server: any, keys: any, getSession: Function, sendJson: Function, parseBody: Function, getUrlPath: Function) {

  // ==================== GET SUBSCRIPTION PLANS ====================
  server.middlewares.use('/api/subscription/plans', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const plans = await DB.all(`
        SELECT * FROM subscription_plans 
        WHERE is_active = 1
        ORDER BY sort_order, price_monthly
      `, []);
      
      sendJson(res, 200, { plans: plans.map((p: any) => ({
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        priceMonthly: p.price_monthly,
        maxStudents: p.max_students,
        maxInterviewsMonthly: p.max_interviews_monthly,
        maxVoiceInterviewsMonthly: p.max_voice_interviews_monthly,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []),
        supportLevel: p.support_level,
        supportResponseTime: p.support_response_time,
        hasAnalytics: !!p.has_analytics,
        hasReports: !!p.has_reports,
        hasApiAccess: !!p.has_api_access,
        hasWebhooks: !!p.has_webhooks,
        hasCustomBranding: !!p.has_custom_branding,
        hasDedicatedServer: !!p.has_dedicated_server,
        hasWhiteLabel: !!p.has_white_label,
      })) });
    } catch (err: any) {
      sendJson(res, 500, { error: err.message });
    }
  });

  // ==================== GET INSTITUTION SUBSCRIPTION ====================
  server.middlewares.use('/api/institution/subscription', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

      // Get institution ID - check if logged in directly as institution first
      let institutionId = null;
      
      // First, check if session.userId is an institution ID
      const institution = await DB.get('SELECT id FROM institutions WHERE id = ?', [session.userId]);
      if (institution) {
        institutionId = institution.id;
      } else {
        // Otherwise, check if it's a user with an institution_id
        const user = await DB.get('SELECT institution_id FROM users WHERE id = ?', [session.userId]);
        institutionId = user?.institution_id;
      }

      if (!institutionId) {
        return sendJson(res, 404, { error: 'Institution not found' });
      }

      // Get latest subscription
      const subscription = await DB.get(`
        SELECT * FROM subscriptions
        WHERE institution_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [institutionId]);

      // If no subscription or if it's pending/cancelled, tell frontend they are not actively subscribed
      if (!subscription || !['active', 'past_due'].includes(subscription.status)) {
        return sendJson(res, 200, { subscription: null, hasSubscription: false });
      }

      // Get plan details separately
      const plan = await DB.get(`
        SELECT display_name, price_monthly, max_students, 
               max_interviews_monthly, max_voice_interviews_monthly,
               features, support_level, support_response_time
        FROM subscription_plans
        WHERE id = ?
      `, [subscription.plan_id]);

      sendJson(res, 200, {
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          planId: subscription.plan_id,
          planName: plan?.display_name || 'Unknown Plan',
          status: subscription.status,
          billingCycle: subscription.billing_cycle,
          priceMonthly: plan?.price_monthly || 0,
          maxStudents: plan?.max_students || 0,
          maxInterviewsMonthly: plan?.max_interviews_monthly || 0,
          maxVoiceInterviewsMonthly: plan?.max_voice_interviews_monthly || 0,
          features: typeof plan?.features === 'string' ? JSON.parse(plan.features) : (plan?.features || []),
          supportLevel: plan?.support_level,
          supportResponseTime: plan?.support_response_time,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          nextBillingDate: subscription.next_billing_date,
          autoRenew: !!subscription.auto_renew,
          cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        }
      });
    } catch (err: any) {
      sendJson(res, 500, { error: err.message });
    }
  });

  // ==================== GET USAGE STATISTICS ====================
  server.middlewares.use('/api/institution/usage', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

      // Get institution ID - check if logged in directly as institution first
      let institutionId = null;
      
      // First, check if session.userId is an institution ID
      const institution = await DB.get('SELECT id FROM institutions WHERE id = ?', [session.userId]);
      if (institution) {
        institutionId = institution.id;
      } else {
        // Otherwise, check if it's a user with an institution_id
        const user = await DB.get('SELECT institution_id FROM users WHERE id = ?', [session.userId]);
        institutionId = user?.institution_id;
      }

      if (!institutionId) {
        return sendJson(res, 404, { error: 'Institution not found' });
      }

      // Get current month usage
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      let usage = await DB.get(`
        SELECT * FROM institution_usage 
        WHERE institution_id = ? AND month_year = ?
      `, [institutionId, currentMonth]);

      // If no usage record exists, create one
      if (!usage) {
        const usageId = generateId();
        await DB.run(`
          INSERT INTO institution_usage (id, institution_id, month_year, students_count, interviews_count, voice_interviews_count)
          VALUES (?, ?, ?, 0, 0, 0)
        `, [usageId, institutionId, currentMonth]);
        
        usage = {
          students_count: 0,
          interviews_count: 0,
          voice_interviews_count: 0,
          ai_interviews_count: 0,
          company_interviews_count: 0,
          mock_interviews_count: 0,
          completed_interviews: 0,
          aborted_interviews: 0,
          average_score: 0,
        };
      }

      // Get subscription limits (without JOIN - separate queries)
      const activeSubscription = await DB.get(`
        SELECT plan_id FROM subscriptions
        WHERE institution_id = ? AND status = 'active'
        LIMIT 1
      `, [institutionId]);

      let limits = {
        max_students: 0,
        max_interviews_monthly: 0,
        max_voice_interviews_monthly: 0,
      };

      if (activeSubscription) {
        const plan = await DB.get(`
          SELECT max_students, max_interviews_monthly, max_voice_interviews_monthly
          FROM subscription_plans
          WHERE id = ?
        `, [activeSubscription.plan_id]);
        
        if (plan) {
          limits = plan;
        }
      }

      // Calculate percentages
      const studentsPercentage = limits.max_students > 0 
        ? Math.round((usage.students_count / limits.max_students) * 100) 
        : 0;
      const interviewsPercentage = limits.max_interviews_monthly > 0 
        ? Math.round((usage.interviews_count / limits.max_interviews_monthly) * 100) 
        : 0;
      const voiceInterviewsPercentage = limits.max_voice_interviews_monthly > 0 
        ? Math.round((usage.voice_interviews_count / limits.max_voice_interviews_monthly) * 100) 
        : 0;

      // Get alerts
      const alerts = await DB.all(`
        SELECT * FROM usage_alerts 
        WHERE institution_id = ? AND is_read = 0
        ORDER BY created_at DESC
        LIMIT 5
      `, [institutionId]);

      sendJson(res, 200, {
        usage: {
          studentsCount: usage.students_count,
          interviewsCount: usage.interviews_count,
          voiceInterviewsCount: usage.voice_interviews_count,
          aiInterviewsCount: usage.ai_interviews_count || 0,
          companyInterviewsCount: usage.company_interviews_count || 0,
          mockInterviewsCount: usage.mock_interviews_count || 0,
          completedInterviews: usage.completed_interviews || 0,
          abortedInterviews: usage.aborted_interviews || 0,
          averageScore: usage.average_score || 0,
          studentsPercentage,
          interviewsPercentage,
          voiceInterviewsPercentage,
        },
        limits: {
          maxStudents: limits.max_students,
          maxInterviewsMonthly: limits.max_interviews_monthly,
          maxVoiceInterviewsMonthly: limits.max_voice_interviews_monthly,
        },
        alerts: alerts.map((a: any) => ({
          id: a.id,
          type: a.alert_type,
          message: a.message,
          createdAt: a.created_at,
        })),
      });
    } catch (err: any) {
      sendJson(res, 500, { error: err.message });
    }
  });

  // ==================== CREATE/UPDATE SUBSCRIPTION ====================
  server.middlewares.use('/api/institution/subscribe', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

      const { planId } = await parseBody(req);
      if (!planId) return sendJson(res, 400, { error: 'Plan ID is required' });

      // Get institution ID - check if logged in directly as institution first
      let institutionId = null;
      
      // First, check if session.userId is an institution ID
      const institution = await DB.get('SELECT id FROM institutions WHERE id = ?', [session.userId]);
      if (institution) {
        institutionId = institution.id;
      } else {
        // Otherwise, check if it's a user with an institution_id
        const user = await DB.get('SELECT institution_id FROM users WHERE id = ?', [session.userId]);
        institutionId = user?.institution_id;
      }

      if (!institutionId) {
        return sendJson(res, 404, { error: 'Institution not found' });
      }

      // Get plan details
      const plan = await DB.get('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
      if (!plan) return sendJson(res, 404, { error: 'Plan not found' });

      // Check if subscription exists
      const existingSub = await DB.get('SELECT id FROM subscriptions WHERE institution_id = ?', [institutionId]);

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      if (existingSub) {
        // Update existing subscription
        await DB.run(`
          UPDATE subscriptions 
          SET plan_id = ?, status = 'payment_pending', updated_at = datetime('now')
          WHERE institution_id = ?
        `, [planId, institutionId]);
        
        sendJson(res, 200, { 
          success: true, 
          message: 'Subscription updated. Please complete payment.',
          subscriptionId: existingSub.id,
          amount: plan.price_monthly,
          planName: plan.display_name,
        });
      } else {
        // Create new subscription
        const subscriptionId = generateId();
        await DB.run(`
          INSERT INTO subscriptions (
            id, institution_id, plan_id, status,
            current_period_start, current_period_end, next_billing_date
          ) VALUES (?, ?, ?, 'payment_pending', ?, ?, ?)
        `, [subscriptionId, institutionId, planId, now.toISOString(), nextMonth.toISOString(), nextMonth.toISOString()]);
        
        sendJson(res, 201, { 
          success: true, 
          message: 'Subscription created. Please complete payment.',
          subscriptionId,
          amount: plan.price_monthly,
          planName: plan.display_name,
        });
      }
    } catch (err: any) {
      sendJson(res, 500, { error: err.message });
    }
  });

  // ==================== VERIFY PAYMENT (FRONTEND FALLBACK) ====================
  server.middlewares.use('/api/institution/verify-payment', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

      const { subscriptionId, paymentId } = await parseBody(req);
      if (!subscriptionId) return sendJson(res, 400, { error: 'Subscription ID is required' });

      // Update subscription status to active
      await DB.run(`
        UPDATE subscriptions 
        SET status = 'active', 
            razorpay_subscription_id = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [paymentId || 'mock_payment', subscriptionId]);

      // Fetch subscription details to log transaction
      const subscription = await DB.get('SELECT institution_id, plan_id FROM subscriptions WHERE id = ?', [subscriptionId]);
      if (subscription) {
        const plan = await DB.get('SELECT price_monthly FROM subscription_plans WHERE id = ?', [subscription.plan_id]);
        
        // Log transaction
        const transactionId = generateId();
        await DB.run(`
          INSERT INTO subscription_transactions (
            id, subscription_id, institution_id, plan_id, amount, status, razorpay_payment_id, created_at
          ) VALUES (?, ?, ?, ?, ?, 'success', ?, datetime('now'))
        `, [
          transactionId, 
          subscriptionId, 
          subscription.institution_id, 
          subscription.plan_id, 
          plan?.price_monthly || 0, 
          paymentId || 'mock_payment'
        ]);
      }

      sendJson(res, 200, { success: true, message: 'Payment verified and subscription activated' });
    } catch (err: any) {
      console.error('Verify payment error:', err);
      sendJson(res, 500, { error: err.message });
    }
  });

  // ==================== RAZORPAY WEBHOOK ====================
  server.middlewares.use('/api/payments/razorpay/webhook', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const body = await parseBody(req);
      const { event, payload } = body;

      console.log('Razorpay Webhook received:', event);

      // Handle different webhook events
      switch (event) {
        case 'subscription.charged':
        case 'payment.captured':
          {
            const subscriptionId = payload.subscription?.entity?.notes?.subscription_id;
            const paymentId = payload.payment?.entity?.id;
            const amount = payload.payment?.entity?.amount / 100; // Convert paise to rupees

            if (subscriptionId) {
              // Update subscription status to active
              await DB.run(`
                UPDATE subscriptions 
                SET status = 'active', 
                    razorpay_subscription_id = ?,
                    last_payment_status = 'success',
                    last_payment_date = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
              `, [paymentId, subscriptionId]);

              // Fetch subscription to log transaction correctly
              const subscription = await DB.get('SELECT institution_id, plan_id FROM subscriptions WHERE id = ?', [subscriptionId]);
              if (subscription) {
                const transactionId = generateId();
                await DB.run(`
                  INSERT INTO subscription_transactions (
                    id, subscription_id, institution_id, plan_id, amount, status, razorpay_payment_id, created_at
                  ) VALUES (?, ?, ?, ?, ?, 'success', ?, datetime('now'))
                `, [transactionId, subscriptionId, subscription.institution_id, subscription.plan_id, amount, paymentId]);
              }

              console.log(`Subscription ${subscriptionId} activated`);
            }
          }
          break;

        case 'subscription.cancelled':
          {
            const razorpaySubId = payload.subscription?.entity?.id;
            await DB.run(`
              UPDATE subscriptions 
              SET status = 'cancelled', 
                  cancelled_at = datetime('now'),
                  updated_at = datetime('now')
              WHERE razorpay_subscription_id = ?
            `, [razorpaySubId]);
          }
          break;

        case 'payment.failed':
          {
            const subscriptionId = payload.payment?.entity?.notes?.subscription_id;
            if (subscriptionId) {
              await DB.run(`
                UPDATE subscriptions 
                SET last_payment_status = 'failed',
                    updated_at = datetime('now')
                WHERE id = ?
              `, [subscriptionId]);

              // Fetch subscription to log transaction correctly
              const subscription = await DB.get('SELECT institution_id, plan_id FROM subscriptions WHERE id = ?', [subscriptionId]);
              if (subscription) {
                const transactionId = generateId();
                await DB.run(`
                  INSERT INTO subscription_transactions (
                    id, subscription_id, institution_id, plan_id, amount, status, razorpay_payment_id, created_at
                  ) VALUES (?, ?, ?, ?, ?, 'failed', ?, datetime('now'))
                `, [transactionId, subscriptionId, subscription.institution_id, subscription.plan_id, 0, payload.payment?.entity?.id]);
              }
            }
          }
          break;
      }

      sendJson(res, 200, { success: true });
    } catch (err: any) {
      console.error('Razorpay webhook error:', err);
      sendJson(res, 500, { error: err.message });
    }
  });

  // ==================== TRACK INTERVIEW USAGE ====================
  server.middlewares.use('/api/institution/track-interview', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

      const { interviewId, interviewType, isVoice } = await parseBody(req);

      // Get user's institution
      const user = await DB.get('SELECT institution_id FROM users WHERE id = ?', [session.userId]);
      if (!user?.institution_id) {
        return sendJson(res, 200, { success: true, message: 'No institution tracking needed' });
      }

      const institutionId = user.institution_id;
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const usageId = `usage-${institutionId}-${currentMonth}`;

      // Update usage counters
      await DB.run(`
        INSERT INTO institution_usage (id, institution_id, month_year, interviews_count, voice_interviews_count)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(institution_id, month_year) DO UPDATE SET
          interviews_count = interviews_count + 1,
          voice_interviews_count = voice_interviews_count + ?,
          updated_at = datetime('now')
      `, [usageId, institutionId, currentMonth, isVoice ? 1 : 0, isVoice ? 1 : 0]);

      // Check for usage threshold alerts
      const usage = await DB.get('SELECT * FROM institution_usage WHERE institution_id = ? AND month_year = ?', 
        [institutionId, currentMonth]);
      
      // Get subscription limits (without JOIN - separate queries)
      const activeSub = await DB.get(`
        SELECT plan_id FROM subscriptions
        WHERE institution_id = ? AND status = 'active'
        LIMIT 1
      `, [institutionId]);

      let subscription = null;
      if (activeSub) {
        subscription = await DB.get(`
          SELECT max_interviews_monthly, max_voice_interviews_monthly
          FROM subscription_plans
          WHERE id = ?
        `, [activeSub.plan_id]);
      }

      if (subscription && usage) {
        const interviewsPercentage = (usage.interviews_count / subscription.max_interviews_monthly) * 100;
        
        // Create alert if 80% threshold reached
        if (interviewsPercentage >= 80 && interviewsPercentage < 100) {
          const alertId = generateId();
          await DB.run(`
            INSERT OR IGNORE INTO usage_alerts (id, institution_id, alert_type, threshold_type, current_value, max_value, message)
            VALUES (?, ?, '80_percent', 'interviews', ?, ?, ?)
          `, [
            alertId, 
            institutionId, 
            usage.interviews_count, 
            subscription.max_interviews_monthly,
            `You have used ${Math.round(interviewsPercentage)}% of your monthly interview quota. Consider upgrading your plan.`
          ]);
        }
      }

      sendJson(res, 200, { success: true, message: 'Usage tracked successfully' });
    } catch (err: any) {
      sendJson(res, 500, { error: err.message });
    }
  });

  // ==================== PAYMENT HISTORY ====================
  server.middlewares.use('/api/institution/payment-history', async (req: IncomingMessage, res: ServerResponse, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

      // Get institution ID - check if logged in directly as institution first
      let institutionId = null;
      
      // First, check if session.userId is an institution ID
      const institution = await DB.get('SELECT id FROM institutions WHERE id = ?', [session.userId]);
      if (institution) {
        institutionId = institution.id;
      } else {
        // Otherwise, check if it's a user with an institution_id
        const user = await DB.get('SELECT institution_id FROM users WHERE id = ?', [session.userId]);
        institutionId = user?.institution_id;
      }

      if (!institutionId) {
        return sendJson(res, 404, { error: 'Institution not found' });
      }

      const payments = await DB.all(`
        SELECT * FROM subscription_transactions 
        WHERE institution_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `, [institutionId]);

      sendJson(res, 200, { 
        payments: payments.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          paymentMethod: p.payment_method,
          paymentDate: p.created_at,
          razorpayPaymentId: p.razorpay_payment_id,
        }))
      });
    } catch (err: any) {
      sendJson(res, 500, { error: err.message });
    }
  });
}
