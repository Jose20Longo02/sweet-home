# Developer Role Switching Feature

This feature allows specific developer accounts to choose between SuperAdmin and Admin roles when logging in.

## Setup

### 1. Add Developer Email to Environment Variables

Add your developer email(s) to your `.env` file:

```env
DEVELOPER_EMAILS=your.email@example.com,another.dev@example.com
```

**Notes:**
- Multiple emails can be separated by commas
- Emails are case-insensitive
- The user account must have the `SuperAdmin` role in the database

### 2. How It Works

When a user with an email listed in `DEVELOPER_EMAILS` logs in:

1. After successful authentication, they are redirected to `/auth/select-role`
2. They see two options:
   - **SuperAdmin**: Full access to all features, team management, and system settings
   - **Admin**: Manage properties and projects (limited access)
3. After selecting a role, they are redirected to the appropriate dashboard
4. The selected role is stored in their session

### 3. Usage

1. Log in with your developer account
2. Select your desired role (SuperAdmin or Admin)
3. Access the dashboard with the selected role
4. To switch roles, simply log out and log back in

### 4. Security Notes

- Only accounts with `SuperAdmin` role in the database can use this feature
- The actual database role remains unchanged
- The session role is temporary and resets on logout
- Regular users (non-developers) follow the normal login flow

### 5. Example

If your email is `developer@example.com` and it's in the `DEVELOPER_EMAILS` list:

```
Login → Role Selection Page → Choose Role → Dashboard
```

If your email is NOT in the list:

```
Login → Dashboard (based on database role)
```

## Troubleshooting

- **Role selection not showing**: Verify your email is in `DEVELOPER_EMAILS` and matches exactly
- **Access denied**: Ensure your account has `SuperAdmin` role in the database
- **Session issues**: Try clearing cookies and logging in again

