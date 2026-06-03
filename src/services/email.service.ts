import { config } from '@/config';
import { logger } from '@/utils/logger';

interface TemplateVars {
  task: string;
  meetingTitle: string;
  assignee: string;
  dueDate: string;
  overdueDays: string;
}

const getHtmlTemplate = (vars: TemplateVars): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      padding: 32px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px;
    }
    .alert-badge {
      display: inline-block;
      background-color: #fef2f2;
      color: #ef4444;
      font-weight: 600;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 9999px;
      margin-bottom: 24px;
      border: 1px solid #fee2e2;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .task-title {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .details-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .details-table td.label {
      width: 120px;
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .details-table td.value {
      color: #334155;
      font-size: 14px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Action Item Reminder</h1>
        <p>Meeting Intelligence Service</p>
      </div>
      <div class="content">
        <div class="alert-badge">Overdue by ${vars.overdueDays} days</div>
        <h2 class="task-title">${vars.task}</h2>
        <table class="details-table">
          <tr>
            <td class="label">Meeting</td>
            <td class="value"><strong>${vars.meetingTitle}</strong></td>
          </tr>
          <tr>
            <td class="label">Assignee</td>
            <td class="value">${vars.assignee}</td>
          </tr>
          <tr>
            <td class="label">Due Date</td>
            <td class="value">${vars.dueDate}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0;">
          This action item was captured during the meeting and is now overdue. Please update its status or complete the task.
        </p>
      </div>
      <div class="footer">
        <p>This is an automated reminder. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export class EmailService {
  /**
   * Dispatch an overdue action item reminder email.
   * Calls the Resend API or logs a mock payload if no API key is set.
   */
  async sendOverdueReminder(params: {
    to: string;
    task: string;
    meetingTitle: string;
    assignee: string;
    dueDate: Date;
  }): Promise<{ success: boolean; error?: string }> {
    const { to, task, meetingTitle, assignee, dueDate } = params;

    const formattedDate = dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const overdueMs = Date.now() - dueDate.getTime();
    const overdueDays = Math.max(1, Math.floor(overdueMs / (1000 * 60 * 60 * 24)));

    const html = getHtmlTemplate({
      task,
      meetingTitle,
      assignee,
      dueDate: formattedDate,
      overdueDays: String(overdueDays),
    });

    const text = `Action Item Reminder from Meeting Intelligence Service\n\nTask: ${task}\nMeeting: ${meetingTitle}\nAssignee: ${assignee}\nDue Date: ${formattedDate}\nOverdue by: ${overdueDays} days\n\nThis task is now overdue. Please update its status or complete the task.`;

    if (config.email.resendApiKey === 'mock-key') {
      logger.info('[MOCK EMAIL] Dispatching overdue action item reminder', {
        from: config.email.from,
        to,
        subject: `⚠️ Overdue Action Item: ${task}`,
        text,
      });
      return { success: true };
    }

    try {
      const response = await globalThis.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.email.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.email.from,
          to: [to],
          subject: `⚠️ Overdue Action Item: ${task}`,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        return {
          success: false,
          error: `Resend API returned status ${response.status}: ${errBody}`,
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}

export const emailService = new EmailService();
