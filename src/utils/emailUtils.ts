
import { InterviewSession } from "@/types";
import { useToast } from "@/components/ui/use-toast";

// Function to send selection email to a user who passed the interview
export const sendSelectionEmail = async (interview: InterviewSession): Promise<boolean> => {
  console.log(`Sending selection email for interview ${interview.id}`);
  
  try {
    // Get user name from interview ID or default
    const userName = interview.id.includes("user") 
      ? interview.id.split("-")[0].charAt(0).toUpperCase() + interview.id.split("-")[0].slice(1)
      : "Candidate";
    
    // Prepare email content
    const emailData = {
      to: interview.id.includes("user") ? `user@example.com` : "candidate@example.com", // In a real app, this would be the user's actual email
      subject: `You've Cleared the Interview!`,
      body: `
🎉 Congratulations ${userName}!

You have successfully cleared the ${interview.roleName} mock interview. Your Score: ${interview.score?.toFixed(1)}/10
Feedback: ${interview.feedback?.substring(0, 150)}${interview.feedback && interview.feedback.length > 150 ? "..." : ""}

Get ready for your next step with confidence!
      `,
      attachments: ["pdf_report.pdf"] // In a real app, we'd generate and attach the PDF
    };
    
    // In a real production app, this would use a backend email service
    const sendRealEmail = async (emailData: any) => {
      try {
        // For demonstration, we'll simulate a successful API call
        console.log("Attempting to send real email via API:", emailData);
        
        // In a production environment, this would use a real email service API
        // Example with a serverless function or backend API:
        /*
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        });
        
        if (!response.ok) {
          throw new Error('Email API error');
        }
        
        return await response.json();
        */
        
        // For this demo, we'll simulate a successful email send with a slight delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show a toast notification
        if (typeof window !== 'undefined' && window.confirm) {
          window.alert(`
📧 EMAIL SENT SUCCESSFULLY TO: ${emailData.to}
---
SUBJECT: ${emailData.subject}
---
${emailData.body}
          `);
        }
        
        return { success: true, messageId: `email-${Date.now()}` };
      } catch (error) {
        console.error("Email API error:", error);
        throw error;
      }
    };
    
    // Send the email
    const emailResult = await sendRealEmail(emailData);
    console.log("Email sent result:", emailResult);
    
    // Mark the interview as selected and message generated in localStorage
    const storedInterview = localStorage.getItem(`mockmate-interview-${interview.id}`);
    if (storedInterview) {
      const updatedInterview = { 
        ...JSON.parse(storedInterview), 
        selected: true,
        messageGenerated: true 
      };
      localStorage.setItem(`mockmate-interview-${interview.id}`, JSON.stringify(updatedInterview));
    }
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
