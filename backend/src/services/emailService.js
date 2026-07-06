// Mock Email Dispatcher Service
// Simulates sending emails for password reset, workspace invites, and registrations.

export const emailService = {
  /**
   * Sends user verification link
   */
  sendVerificationEmail: async (email, name, verificationLink) => {
    console.log('\n================== [OUTGOING EMAIL] ==================');
    console.log(`To: ${name} <${email}>`);
    console.log('Subject: Verify your CollabSpace Account');
    console.log(`Content:\nWelcome ${name}!\n\nPlease verify your email by clicking the link below:\n${verificationLink}\n\nLink expires in 24 hours.`);
    console.log('======================================================\n');
    return true;
  },

  /**
   * Sends password reset link
   */
  sendPasswordResetEmail: async (email, name, resetLink) => {
    console.log('\n================== [OUTGOING EMAIL] ==================');
    console.log(`To: ${name} <${email}>`);
    console.log('Subject: Reset your CollabSpace Password');
    console.log(`Content:\nHi ${name},\n\nYou requested to reset your password. Click the link below to set a new password:\n${resetLink}\n\nLink expires in 1 hour.`);
    console.log('======================================================\n');
    return true;
  },

  /**
   * Sends workspace member invitation link
   */
  sendWorkspaceInviteEmail: async (email, inviterName, workspaceName, inviteLink, role) => {
    console.log('\n================== [OUTGOING EMAIL] ==================');
    console.log(`To: ${email}`);
    console.log(`Subject: Invitation to join ${workspaceName} on CollabSpace`);
    console.log(`Content:\nHello,\n\n${inviterName} has invited you to join the workspace "${workspaceName}" as a ${role}.\n\nAccept the invitation by clicking the link below:\n${inviteLink}\n\nLink expires in 7 days.`);
    console.log('======================================================\n');
    return true;
  }
};
