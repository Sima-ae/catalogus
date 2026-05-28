# TripleZero iT Setup Instructions

## 🚀 **Complete Setup Guide**

This guide will help you set up the complete authentication system, database, and admin functionality for your TripleZero iT application.

## 📋 **Prerequisites**

1. **Supabase Project**: You need a Supabase project set up
2. **Environment Variables**: Configure your `.env.local` file
3. **Database Access**: Access to your Supabase SQL editor

## 🔧 **Step 1: Environment Configuration**

Create a `.env.local` file in your project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ Important Notes:**
- Remove any `@` symbols from the URL
- Never commit `.env.local` to version control
- Use the exact format shown above

## 🗄️ **Step 2: Database Setup**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the complete `database_schema.sql` file**

This will create:
- ✅ All necessary tables
- ✅ Row Level Security (RLS) policies
- ✅ Sample products and categories
- ✅ Default settings
- ✅ Triggers and functions

## 👤 **Step 3: Create Admin User**

### **Option A: Through Supabase Dashboard (Recommended)**

1. **Go to Authentication > Users**
2. **Click "Add User"**
3. **Enter your desired admin credentials:**
   - Email: `your-admin-email@domain.com`
   - Password: `your-secure-password`
   - Email Confirm: `true`
4. **Click "Create User"**

### **Option B: Through SQL (Advanced)**

```sql
-- First create the user in auth.users (if not exists)
-- Note: This is advanced and should be done carefully
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    'your-admin-email@domain.com',
    crypt('your-secure-password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Then update the user profile to admin role
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@domain.com';
```

## 🔐 **Step 4: Test Authentication**

1. **Start your development server**: `npm run dev`
2. **Navigate to**: `/login`
3. **Login with your admin credentials**
4. **You should be redirected to**: `/admin`

## 🛡️ **Step 5: Verify Admin Access**

1. **Check that `/admin` is accessible**
2. **Verify you can see real data from the database**
3. **Test product management features**
4. **Verify logout functionality**

## 📊 **Database Tables Created**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `user_profiles` | User accounts and roles | Admin, Buyer, Seller roles |
| `products` | Product catalog | Images, pricing, categories |
| `categories` | Product categories | Hierarchical structure |
| `orders` | Customer orders | Payment status, tracking |
| `order_items` | Order line items | Product details per order |
| `cart_items` | Shopping cart | User and session-based |
| `reviews` | Product reviews | Rating system, moderation |
| `wishlist` | User wishlists | Save for later |
| `downloads` | Download tracking | Usage analytics |
| `notifications` | User notifications | System alerts |
| `settings` | App configuration | Global settings |

## 🔒 **Security Features**

- **Row Level Security (RLS)**: Data access control
- **Role-based Access**: Admin, Seller, Buyer permissions
- **Authentication Required**: Protected admin routes
- **Session Management**: Secure user sessions
- **Environment Variables**: Secure credential management

## 🎯 **Admin Dashboard Features**

- ✅ **Real-time Statistics**: Revenue, orders, products, vendors
- ✅ **Product Management**: View, edit, delete products
- ✅ **Order Management**: View all customer orders
- ✅ **User Management**: View user profiles and roles
- ✅ **Category Management**: Organize products
- ✅ **Analytics**: Sales and performance data

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"supabaseUrl is required"**
   - Check your `.env.local` file exists
   - Remove any `@` symbols from the URL
   - Ensure no extra spaces or characters

2. **"useAuth must be used within AuthProvider"**
   - Ensure `AuthProvider` wraps your app in `layout.tsx`

3. **"Cannot read properties of undefined"**
   - Check that Supabase environment variables are set correctly
   - Verify the URL format is correct

4. **"Permission denied"**
   - Verify RLS policies are enabled and correct
   - Check user role in database

5. **Login not working**
   - Verify user exists in `auth.users`
   - Check user profile has correct role

### **Debug Steps:**

1. **Check browser console for errors**
2. **Verify Supabase connection**
3. **Check database tables exist**
4. **Verify RLS policies**
5. **Check user authentication status**

## 🔄 **Next Steps**

After setup is complete:

1. **Add more products** through admin dashboard
2. **Customize categories** as needed
3. **Set up payment processing** (Stripe, PayPal, etc.)
4. **Configure email notifications**
5. **Add analytics and reporting**
6. **Set up backup and monitoring**

## 📞 **Support**

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Verify all environment variables**
3. **Ensure database schema is applied correctly**
4. **Check Supabase project settings**

## 🎉 **Success Indicators**

Your setup is complete when:

- ✅ You can login with your admin credentials
- ✅ `/admin` route is accessible and shows real data
- ✅ Products display on the main page
- ✅ Cart functionality works
- ✅ All database tables exist with sample data
- ✅ No authentication errors in console

## 🔐 **Security Best Practices**

- **Never hardcode credentials** in your application code
- **Use environment variables** for all sensitive information
- **Keep `.env.local` out of version control**
- **Use strong passwords** for admin accounts
- **Regularly rotate credentials** and access keys
- **Monitor authentication logs** for suspicious activity

---

**Happy coding! 🚀**
