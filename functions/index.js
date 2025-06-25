import * as functions from 'firebase-functions';
import nodemailer from 'nodemailer';

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendInviteEmail = functions.firestore
  .document('org_members/{memberId}')
  .onCreate(async (snap, context) => {
    const memberData = snap.data();
    
    try {
      // Get organization details
      const orgDoc = await admin.firestore()
        .doc(`organizations/${memberData.organization_id}`)
        .get();
      
      const orgData = orgDoc.data();
      
      // Email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: memberData.email,
        subject: `Invitation to join ${orgData.name} on LiQid`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1E4D3A;">You've been invited!</h2>
            <p>You've been invited to join <strong>${orgData.name}</strong> on LiQid as a <strong>${memberData.role}</strong>.</p>
            
            ${memberData.custom_message ? `
              <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <p style="margin: 0; font-style: italic;">${memberData.custom_message}</p>
              </div>
            ` : ''}
            
            <p>Click the button below to accept the invitation and join the team:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL}/accept-invite/${context.params.memberId}" 
                 style="background: linear-gradient(90deg, #2563eb, #9333ea, #db2777);
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 25px;
                        font-weight: 500;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you don't have a LiQid account yet, you'll be able to create one after accepting the invitation.
            </p>
          </div>
        `
      };

      // Send email
      await transporter.sendMail(mailOptions);
      
      // Update member status to indicate email sent
      await snap.ref.update({
        email_sent: true,
        email_sent_at: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Error sending invite email:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send invite email');
    }
  });