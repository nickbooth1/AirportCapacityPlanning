const nodemailer = require('nodemailer');
const MaintenanceRequest = require('../models/MaintenanceRequest');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    
    // Use process.env variables
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT || 587;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailSecure = process.env.EMAIL_SECURE === 'true';
    
    if (emailHost && emailUser && emailPassword) {
      try {
          this.transporter = nodemailer.createTransport({
            host: emailHost,
            port: parseInt(emailPort, 10),
            secure: emailSecure,
            auth: {
              user: emailUser,
              pass: emailPassword
            }
          });
          this.initialized = true;
          console.log('Email notification service initialized.');
      } catch (error) {
          console.error('Failed to initialize email transporter:', error);
      }
    } else {
        console.warn('Email notifications not configured. Missing EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD environment variables.');
    }
  }
  
  async sendEmail(options) {
    if (!this.initialized) {
      console.warn('Email notifications not configured or failed to initialize.');
      return null;
    }
    
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || `\"CapaCity System\" <noreply@${process.env.EMAIL_HOST}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        ...(options.html && { html: options.html })
      };
      
      console.log(`Sending email to ${options.to} with subject \"${options.subject}\"`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }
  
  async sendMaintenanceRequestNotification(requestId, eventType) {
    const request = await MaintenanceRequest.query()
      .findById(requestId)
      .withGraphFetched('[stand(selectName), status(selectName)]');
    
    if (!request) {
      console.error(`Maintenance request not found for notification: ${requestId}`);
      return;
    }
    
    let subject, text, recipients = [];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const requestUrl = `${frontendUrl}/maintenance/requests/${request.id}`;
    const standName = request.stand?.name || request.stand_id;

    const commonDetails = 
        `Title: ${request.title}\n` +
        `Stand: ${standName}\n` +
        `Start: ${new Date(request.start_datetime).toLocaleString()}\n` +
        `End: ${new Date(request.end_datetime).toLocaleString()}\n\n` +
        `View Request: ${requestUrl}\n`;

    // Get recipients from environment variables (comma-separated emails)
    const approverEmails = (process.env.NOTIFICATION_APPROVERS || '').split(',').map(e => e.trim()).filter(e => e);
    const operationEmails = (process.env.NOTIFICATION_OPERATIONS || '').split(',').map(e => e.trim()).filter(e => e);

    switch (eventType) {
      case 'created':
        subject = `[CapaCity] New Maintenance Request: ${request.title}`;
        text = `A new maintenance request has been created for stand ${standName}.\n\n` +
               `Requested by: ${request.requestor_name} (${request.requestor_department})\n` +
               `Priority: ${request.priority}\n\n` + commonDetails;
        recipients = approverEmails;
        break;
        
      case 'approved':
        subject = `[CapaCity] Maintenance Approved: ${request.title}`;
        text = `Your maintenance request for stand ${standName} has been approved.\n\n` + commonDetails;
        recipients = [request.requestor_email, ...operationEmails];
        break;
        
      case 'rejected':
        subject = `[CapaCity] Maintenance Rejected: ${request.title}`;
        text = `Your maintenance request for stand ${standName} has been rejected.\n\n` + commonDetails;
        recipients = [request.requestor_email];
        break;
        
      case 'updated':
        subject = `[CapaCity] Maintenance Updated: ${request.title}`;
        text = `The maintenance request for stand ${standName} has been updated.\n\n` +
               `Current Status: ${request.status?.name || request.status_id}\n\n` + commonDetails;
        recipients = [request.requestor_email, ...approverEmails];
        break;
        
      case 'completed':
        subject = `[CapaCity] Maintenance Completed: ${request.title}`;
        text = `Maintenance work has been completed for stand ${standName}.\n\n` + commonDetails + 
               `The stand is now available for normal operations.`;
        recipients = [request.requestor_email, ...operationEmails];
        break;
        
      default:
        console.warn(`Unknown notification event type: ${eventType}`);
        return;
    }
    
    const validRecipients = [...new Set(recipients)].filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    
    if (!validRecipients.length) {
        console.warn(`No valid recipients found for ${eventType} notification for request ${requestId}`);
        return;
    }

    const promises = validRecipients.map(recipient => {
      return this.sendEmail({ to: recipient, subject, text })
                 .catch(err => console.error(`Failed to send ${eventType} notification to ${recipient}:`, err));
    });
    
    await Promise.allSettled(promises);
  }
}

module.exports = new NotificationService(); 