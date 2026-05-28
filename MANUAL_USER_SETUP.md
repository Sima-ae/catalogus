# Manual User Setup Guide for TripleZero iT

## 🔧 **Step-by-Step User Creation**

Since the SQL approach had issues, we'll create users manually through the Supabase dashboard.

## 📋 **Prerequisites**

1. ✅ Database schema is imported
2. ✅ Tables exist in your Supabase project
3. ✅ You have access to Supabase dashboard

## 👤 **Step 1: Create Admin User**

### **1.1 Go to Authentication > Users**
- Open your Supabase dashboard
- Navigate to **Authentication** in the left sidebar
- Click **Users**

### **1.2 Add New User**
- Click **"Add User"** button
- Fill in the form:
  - **Email**: `info@000.it.com`
  - **Password**: `Admin123!`
  - **Email Confirm**: ✅ Check this box
- Click **"Create User"**

### **1.3 Verify User Created**
- You should see the new user in the users list
- Status should show as "Confirmed"

## 🛒 **Step 2: Create Buyer User**

### **2.1 Add Another User**
- Click **"Add User"** again
- Fill in the form:
  - **Email**: `buyer@test.com`
  - **Password**: `Buyer123!`
  - **Email Confirm**: ✅ Check this box
- Click **"Create User"**

## 🏪 **Step 3: Create Seller User**

### **3.1 Add Third User**
- Click **"Add User"** again
- Fill in the form:
  - **Email**: `seller@test.com`
  - **Password**: `Seller123!`
  - **Email Confirm**: ✅ Check this box
- Click **"Create User"**

## 🔗 **Step 4: Link Auth Users to Profiles**

### **4.1 Run the Simple SQL**
- Go to **SQL Editor**
- Run the `simple_admin_setup.sql` file
- This creates the user profiles with proper roles

### **4.2 Manual Linking (if needed)**
If the automatic linking doesn't work, run this SQL:

```sql
-- Get the auth user ID for admin
SELECT id FROM auth.users WHERE email = 'info@000.it.com';

-- Update the user profile with the correct auth user ID
UPDATE user_profiles 
SET id = 'AUTH_USER_ID_FROM_ABOVE'
WHERE email = 'info@000.it.com';

-- Repeat for buyer and seller
SELECT id FROM auth.users WHERE email = 'buyer@test.com';
UPDATE user_profiles 
SET id = 'BUYER_AUTH_USER_ID'
WHERE email = 'buyer@test.com';

SELECT id FROM auth.users WHERE email = 'seller@test.com';
UPDATE user_profiles 
SET id = 'SELLER_AUTH_USER_ID'
WHERE email = 'seller@test.com';
```

## ✅ **Step 5: Verify Setup**

### **5.1 Check Authentication Users**
- Go to **Authentication > Users**
- Should see 3 users:
  - `info@000.it.com` (Admin)
  - `buyer@test.com` (Buyer)
  - `seller@test.com` (Seller)

### **5.2 Check User Profiles**
- Go to **Table Editor > user_profiles**
- Should see 3 profiles with correct roles:
  - `info@000.it.com` → role: `admin`
  - `buyer@test.com` → role: `buyer`
  - `seller@test.com` → role: `seller`

### **5.3 Test Login**
- Go to your app: `/login`
- Try logging in with: `info@000.it.com` / `Admin123!`
- Should redirect to `/admin`

## 🚨 **Troubleshooting**

### **Issue: "Invalid login credentials"**
**Solution**: 
1. Check user exists in Authentication > Users
2. Verify email is confirmed
3. Check password is correct

### **Issue: "Permission denied"**
**Solution**:
1. Check user profile exists in user_profiles table
2. Verify role is set to 'admin'
3. Check RLS policies are enabled

### **Issue: User profile not linked**
**Solution**:
1. Run the manual linking SQL above
2. Ensure auth user ID matches profile ID

## 📊 **Expected Results**

After successful setup, you should have:

| Email | Password | Role | Status |
|-------|----------|------|---------|
| `info@000.it.com` | `Admin123!` | `admin` | ✅ Confirmed |
| `buyer@test.com` | `Buyer123!` | `buyer` | ✅ Confirmed |
| `seller@test.com` | `Seller123!` | `seller` | ✅ Confirmed |

## 🔐 **Security Notes**

- ✅ Users are created with confirmed emails
- ✅ Strong passwords are set
- ✅ Roles are properly assigned
- ✅ RLS policies protect data access

## 🎯 **Next Steps**

1. **Test admin login** → `/login` → `/admin`
2. **Verify admin dashboard** shows real data
3. **Test role-based access** for different user types
4. **Add more products** through admin interface

---

**This manual approach should work reliably! Let me know if you encounter any issues.** 🚀
