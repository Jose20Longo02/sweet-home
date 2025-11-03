# Zapier Webhook Setup for Seller Leads

This guide explains how to set up a dedicated Zapier webhook specifically for seller form submissions from the "For Sellers" page.

## Prerequisites

- A Zapier account (free or paid)
- Access to your server's environment variables (.env file or hosting platform dashboard)

## Step 1: Create a Zapier Webhook

1. **Log in to Zapier**
   - Go to [https://zapier.com](https://zapier.com) and sign in to your account

2. **Create a New Zap**
   - Click "Create Zap" in the top right corner
   - Name it something like "Sweet Home - Seller Leads"

3. **Set up the Trigger (Webhook)**
   - Search for "Webhooks by Zapier" in the trigger apps
   - Select **"Catch Hook"** as the trigger event
   - Click "Continue"

4. **Get Your Webhook URL**
   - Zapier will generate a webhook URL that looks like:
     ```
     https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/
     ```
   - **Copy this URL** - you'll need it in the next step
   - Click "Continue" and then "Test trigger"
   - **Leave this test window open** - you'll test it after configuring the webhook

## Step 2: Configure Your Server

You need to add the Zapier webhook URL to your server's environment variables.

### Option A: Local Development (.env file)

1. Open your `.env` file in the project root
2. Add or update the following line:
   ```
   ZAPIER_SELLER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/
   ```
   (Replace with your actual webhook URL from Step 1)

3. Restart your local server for the changes to take effect

### Option B: Production (Render/Heroku/etc.)

1. Log in to your hosting platform dashboard
2. Navigate to your application's environment variables section
3. Add a new environment variable:
   - **Key**: `ZAPIER_SELLER_WEBHOOK_URL`
   - **Value**: `https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/`
   (Replace with your actual webhook URL)

4. Save the changes (most platforms will automatically restart your app)

## Step 3: Test the Webhook

You have two options to test the webhook:

### Option A: Quick Test (Recommended - No Form Submission Needed)

1. **Make sure your server is running** and the environment variable is set
2. **Open your browser** and navigate to:
   ```
   http://localhost:3000/api/leads/test-seller-webhook
   ```
   (Replace with your production URL if testing on production)
3. **Send a POST request** using one of these methods:

   **Using curl (Terminal/Command Prompt):**
   ```bash
   curl -X POST http://localhost:3000/api/leads/test-seller-webhook
   ```
   
   **Using Postman:**
   - Create a new POST request
   - URL: `http://localhost:3000/api/leads/test-seller-webhook`
   - Send the request

   **Using browser (if you have a browser extension like REST Client):**
   - Simply visit the URL with a POST request

4. **Check the response** - You should see:
   ```json
   {
     "success": true,
     "message": "Test payload sent successfully to SELLER webhook",
     "webhook_type": "seller",
     "payload": { ... }
   }
   ```

5. **Go back to Zapier**
   - In your Zap, click "Test trigger" or check the webhook step
   - You should see the test data appear
   - Review the data structure

### Option B: Real Form Test

1. **Go to your website's "For Sellers" page** (`/owners`)
2. **Fill out and submit the form** with test data:
   - Name
   - Email
   - Phone
   - Language
   - Optional: Neighborhood, Size, Rooms, Occupancy status
3. **Go back to Zapier**
   - You should see the webhook receive the actual lead data
   - Review the data structure to understand what fields are available

**Note:** Option A is faster and doesn't create a real lead in your database. Option B tests the full flow including form validation.

## Step 4: Configure Your Zap Action (What Happens Next)

Now that the webhook is set up, you can configure what happens when a seller lead is received:

### Example: Send to Google Sheets

1. In your Zap, click "Add Step" or "Action"
2. Search for "Google Sheets"
3. Select "Create Spreadsheet Row"
4. Connect your Google account
5. Select or create a spreadsheet
6. Map the fields:
   - **Name** → `name`
   - **Email** → `email`
   - **Phone** → `phone`
   - **Language** → `preferred_language`
   - **Neighborhood** → `seller_neighborhood`
   - **Size (sqm)** → `seller_size`
   - **Rooms** → `seller_rooms`
   - **Occupancy** → `seller_occupancy_status`
   - **Submitted At** → `created_at`
   - **Lead ID** → `lead_id`
7. Test the action
8. Turn on the Zap

### Other Popular Actions

- **Send Email** (Gmail, Outlook)
- **Create Task** (Asana, Trello, Monday.com)
- **Add Contact** (HubSpot, Salesforce, Pipedrive)
- **Send Slack Message**
- **Create Calendar Event**
- **Send SMS** (Twilio)
- **Add to CRM** (any CRM with Zapier integration)

## Data Structure

When a seller lead is submitted, your Zapier webhook will receive a JSON payload with the following structure:

```json
{
  "lead_id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+49 123 456789",
  "message": "For Sellers page SELLER lead",
  "source": "seller_form",
  "preferred_language": "en",
  "property_id": null,
  "project_id": null,
  "agent_id": null,
  "seller_neighborhood": "Mitte",
  "seller_size": 75.5,
  "seller_rooms": 2.5,
  "seller_occupancy_status": "empty",
  "created_at": "2024-01-15T10:30:00.000Z",
  "timestamp": "2024-01-15T10:30:00.123Z"
}
```

### Field Descriptions

- **lead_id**: Unique ID of the lead in the database
- **name**: Seller's full name
- **email**: Seller's email address
- **phone**: Seller's phone number (includes country code)
- **message**: Default message for seller leads
- **source**: Always `"seller_form"` for seller leads
- **preferred_language**: Language code (`"en"`, `"de"`, or `"es"`)
- **property_id**: Always `null` for seller leads
- **project_id**: Always `null` for seller leads
- **agent_id**: Always `null` for seller leads (not yet assigned)
- **seller_neighborhood**: Neighborhood name (optional, may be `null`)
- **seller_size**: Property size in square meters (optional, may be `null`)
- **seller_rooms**: Number of rooms, can include decimals like `2.5` (optional, may be `null`)
- **seller_occupancy_status**: Either `"empty"` or `"tenanted"` (optional, may be `null`)
- **created_at**: Timestamp when the lead was created (database format)
- **timestamp**: Current timestamp when webhook was triggered (ISO format)

## Troubleshooting

### Webhook not receiving data

1. **Check environment variable**
   - Verify `ZAPIER_SELLER_WEBHOOK_URL` is set correctly
   - Make sure there are no extra spaces or quotes
   - Restart your server after adding the variable

2. **Check server logs**
   - Look for error messages like:
     - `"Zapier seller webhook URL not configured"` - Variable not set
     - `"Failed to send lead to Zapier seller webhook"` - Connection issue

3. **Test the webhook manually**
   - You can use a tool like Postman or curl to test:
     ```bash
     curl -X POST https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/ \
       -H "Content-Type: application/json" \
       -d '{"test": "data"}'
     ```

### Data not appearing in Zap

1. **Check Zap status**
   - Make sure your Zap is turned ON (toggle in top right)
   - Check if there are any errors in the Zap history

2. **Review webhook data**
   - Click on the webhook step in your Zap
   - Review the sample data to see what fields are available
   - Make sure field names match exactly (case-sensitive)

3. **Test with sample data**
   - Zapier allows you to test with sample data
   - Use this to verify your action steps are configured correctly

## Security Notes

- **Webhook URLs are public endpoints** - Anyone with the URL can send data to it
- However, Zapier URLs are unique and hard to guess
- If you suspect the URL has been compromised, generate a new webhook in Zapier and update your environment variable
- Consider rate limiting (already implemented in the code)
- The webhook only receives data; it doesn't expose sensitive server information

## Multiple Webhooks

You can have both:
- `ZAPIER_WEBHOOK_URL` - For all leads (property, project, contact, seller)
- `ZAPIER_SELLER_WEBHOOK_URL` - Specifically for seller leads

If `ZAPIER_SELLER_WEBHOOK_URL` is not set, seller leads will fall back to using `ZAPIER_WEBHOOK_URL`.

## Need Help?

- **Zapier Documentation**: [https://zapier.com/help](https://zapier.com/help)
- **Webhooks Guide**: [https://zapier.com/help/webhooks](https://zapier.com/help/webhooks)
- **Contact your developer** if you need help with server configuration

