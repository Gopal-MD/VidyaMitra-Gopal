/**
 * Email Service using EmailJS
 * This service sends Round 2 invitation emails without requiring Firebase Functions
 */

import emailjs from '@emailjs/browser';

// ============================================
// CONFIGURATION - CREDENTIALS CONFIGURED
// ============================================
const EMAILJS_CONFIG = {
  publicKey: 'JPZ_LKJ0rD8zqhyoe',      // From EmailJS Dashboard > Account > API Keys
  serviceId: 'service_alzmp9c',      // From EmailJS Dashboard > Email Services
  templateId: 'template_14av879',    // From EmailJS Dashboard > Email Templates
};

// Auto-initialize EmailJS when module loads
try {
  emailjs.init(EMAILJS_CONFIG.publicKey);
  console.log('✅ EmailJS auto-initialized successfully');
} catch (error) {
  console.error('❌ Failed to auto-initialize EmailJS:', error);
}

/**
 * Check if EmailJS is properly configured
 */
export const isEmailConfigured = (): boolean => {
  return (
    EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY_HERE' &&
    EMAILJS_CONFIG.serviceId !== 'YOUR_SERVICE_ID_HERE' &&
    EMAILJS_CONFIG.templateId !== 'YOUR_TEMPLATE_ID_HERE' &&
    EMAILJS_CONFIG.publicKey.length > 0 &&
    EMAILJS_CONFIG.serviceId.length > 0 &&
    EMAILJS_CONFIG.templateId.length > 0
  );
};

/**
 * Send Round 2 invitation email to selected candidate
 * 
 * @param candidateEmail - Candidate's email address
 * @param candidateName - Candidate's name
 * @param roleName - Job role name
 * @param round1Score - Round 1 aptitude test score (percentage)
 * @returns {success: boolean, error?: string}
 */
export const sendRound2InvitationEmail = async (
  candidateEmail: string,
  candidateName: string,
  roleName: string,
  round1Score: number
): Promise<{ success: boolean; error?: string }> => {
  // Validate inputs
  if (!candidateEmail || !candidateName || !roleName || round1Score < 0) {
    return {
      success: false,
      error: 'Invalid input parameters provided'
    };
  }

  // Check configuration
  if (!isEmailConfigured()) {
    console.warn('⚠️ EmailJS not configured properly');
    return {
      success: false,
      error: 'EmailJS not configured. Please check emailService.ts configuration.'
    };
  }

  try {
    // Prepare email template parameters
    const templateParams = {
      to_email: candidateEmail.trim(),
      to_name: candidateName.trim(),
      role_name: roleName.trim(),
      round1_score: Math.round(round1Score).toString(),
      app_url: window.location.origin,
      company_name: 'VidyaMitra',
      current_date: new Date().toLocaleDateString(),
    };

    console.log('📧 Sending Round 2 invitation to:', candidateEmail);
    console.log('📝 Template parameters:', {
      ...templateParams,
      to_email: '***hidden***' // Hide email in logs for privacy
    });

    // Send email via EmailJS
    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    if (response.status === 200) {
      console.log('✅ Email sent successfully to:', candidateEmail);
      return { success: true };
    } else {
      console.error('❌ Email send failed. Status:', response.status, 'Response:', response);
      return {
        success: false,
        error: `Email service returned status ${response.status}: ${response.text || 'Unknown error'}`
      };
    }
  } catch (error: any) {
    console.error('❌ Error sending email:', error);

    const detail = error?.text || error?.message || (typeof error === 'string' ? error : 'Failed to send email');
    let errorMessage = detail;

    // Handle common EmailJS errors
    if (errorMessage.includes('Invalid email')) {
      errorMessage = 'Invalid email address format';
    } else if (errorMessage.includes('Template not found')) {
      errorMessage = 'Email template not found. Please check templateId configuration.';
    } else if (errorMessage.includes('Service not found')) {
      errorMessage = 'Email service not found. Please check serviceId configuration.';
    } else if (errorMessage.includes('Invalid public key')) {
      errorMessage = 'Invalid public key. Please check publicKey configuration.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};
// ============================================
// ROUND 3 EMAIL CONFIG
// ============================================
// ✅ Reuses same EmailJS account as Round 2.
// ⚠️ USER: Create a new template in your EmailJS dashboard for Round 3
//    and paste its ID below. The template should use these variables:
//    {{to_name}}, {{to_email}}, {{role_name}}, {{round2_score}},
//    {{app_url}}, {{company_name}}, {{current_date}}
const EMAILJS_R3_CONFIG = {
  publicKey: 'JPZ_LKJ0rD8zqhyoe',      // Same as Round 2
  serviceId: 'service_alzmp9c',          // Same as Round 2
  templateId: 'template_oj6hryd',     // ← Replace with your Round 3 template ID
};

try {
  if (EMAILJS_R3_CONFIG.publicKey !== 'YOUR_R3_PUBLIC_KEY') {
    emailjs.init(EMAILJS_R3_CONFIG.publicKey);
    console.log('✅ EmailJS Round 3 initialized');
  }
} catch { /* ignore */ }

/**
 * Send Round 3 (AI Bot Interview) invitation email
 */
export const sendRound3InvitationEmail = async (
  candidateEmail: string,
  candidateName: string,
  roleName: string,
  round2Score: number
): Promise<{ success: boolean; error?: string }> => {
  const isConfigured = EMAILJS_R3_CONFIG.templateId !== 'YOUR_R3_TEMPLATE_ID';

  if (!isConfigured) {
    console.warn('⚠️ Round 3 EmailJS not configured — add credentials to emailService.ts');
    return { success: false, error: 'Round 3 email not configured yet. Add EMAILJS_R3_* credentials to emailService.ts.' };
  }

  if (!candidateEmail || !candidateEmail.includes('@')) {
    return { success: false, error: `Invalid recipient email address: "${candidateEmail || ''}"` };
  }

  try {
    const cleanEmail = candidateEmail.trim();
    const cleanName = (candidateName || 'Candidate').trim();
    const cleanRole = (roleName || 'Software Engineer').trim();
    const scoreStr = Math.round(round2Score || 0).toString();

    const templateParams = {
      // Common recipient email variables across EmailJS templates
      to_email: cleanEmail,
      email: cleanEmail,
      user_email: cleanEmail,
      recipient_email: cleanEmail,
      reply_to: cleanEmail,

      // Common recipient name variables
      to_name: cleanName,
      name: cleanName,
      user_name: cleanName,

      // Role and score details
      role_name: cleanRole,
      round2_score: scoreStr,
      score: scoreStr,

      // System details
      app_url: window.location.origin,
      company_name: 'VidyaMitra',
      current_date: new Date().toLocaleDateString(),
    };

    console.log('📧 Sending Round 3 invitation to:', cleanEmail, 'with template:', EMAILJS_R3_CONFIG.templateId);

    const response = await emailjs.send(
      EMAILJS_R3_CONFIG.serviceId,
      EMAILJS_R3_CONFIG.templateId,
      templateParams,
      EMAILJS_R3_CONFIG.publicKey
    );

    if (response.status === 200) {
      console.log('✅ Round 3 invite sent to:', cleanEmail);
      return { success: true };
    }
    return { success: false, error: `EmailJS status ${response.status}: ${response.text || 'Unknown response'}` };
  } catch (error: any) {
    console.error('❌ Error sending Round 3 email from EmailJS:', error);
    const detail = error?.text || error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return { success: false, error: detail || 'Unknown error from EmailJS' };
  }
};
