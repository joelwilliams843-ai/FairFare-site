# Custom Domain Setup for FairFare
## Domain: www.tryfairfareapp.com

---

## ⚠️ Important: Deploy First

**You MUST deploy your FairFare app before DNS configuration.**

DNS records are generated specifically for your deployment and will only be available after you complete the deployment process.

---

## 📋 Step-by-Step DNS Setup

### Step 1: Deploy Your Application

1. In Emergent interface, click **"Deploy"** button
2. Click **"Deploy Now"**
3. Wait for deployment completion (10-15 minutes)
4. You'll receive a production URL

**Cost:** 50 credits/month

---

### Step 2: Initiate Domain Linking

1. After deployment completes, click **"Link domain"**
2. Enter your domain: `www.tryfairfareapp.com`
3. Click **"Entri"**
4. The system will generate your specific DNS records

---

### Step 3: Configure DNS at Your Registrar

**Emergent will provide one of these:**

#### Option A: CNAME Record (Most Common for www subdomain)
```
Type: CNAME
Name: www
Value: [provided by Emergent after Step 2]
TTL: 3600 (or automatic)
```

#### Option B: A Record
```
Type: A
Name: www
Value: [IP address provided by Emergent after Step 2]
TTL: 3600 (or automatic)
```

---

### Step 4: Critical DNS Changes

**⚠️ BEFORE adding new records:**

1. **Go to your domain registrar** (GoDaddy, Namecheap, Cloudflare, etc.)
2. **Navigate to DNS Management** for tryfairfareapp.com
3. **REMOVE ALL existing A records** for the www subdomain
4. **Then add the CNAME or A record** provided by Emergent

**Why remove A records?**
- Conflicting A records prevent CNAME from working
- This is the #1 cause of domain linking failures

---

## 🌐 DNS Propagation Timeline

### Expected Times:
- **Typical:** 5-15 minutes
- **Maximum:** Up to 24 hours (rare)
- **Local cache:** May take longer on your device

### Check Propagation Status:

**Online Tools:**
- https://dnschecker.org
- https://www.whatsmydns.net
- Enter: www.tryfairfareapp.com

---

## ✅ Verification Steps

### After DNS Configuration:

1. **Wait 15 minutes minimum**
2. **Visit:** https://www.tryfairfareapp.com
3. **Expected:** FairFare app loads
4. **Test features:**
   - GPS location detection
   - Address autocomplete
   - Ride comparison
   - PWA installation

### If Not Working After 15 Minutes:

1. ✅ Verify all A records removed
2. ✅ Check CNAME/A record added correctly
3. ✅ Confirm using "www" subdomain (not bare domain)
4. ✅ Try incognito/private browsing
5. ✅ Clear browser cache
6. ✅ Check DNS propagation tools
7. ✅ Re-link domain in Emergent (click "Entri" again)

---

## 📱 Subdomain vs Root Domain

### Your Setup: www.tryfairfareapp.com ✅

**Benefits:**
- Uses CNAME (cleaner, more flexible)
- Industry standard
- Works with CDNs and load balancers
- Easier to manage

### Alternative: tryfairfareapp.com (bare domain)

**Considerations:**
- Requires A record
- More complex setup
- May need ALIAS or ANAME record support
- Not all registrars support this well

**Recommendation:** Stick with www.tryfairfareapp.com

---

## 🔧 Common DNS Providers

### GoDaddy
1. Login → My Products → DNS
2. Find "www" record
3. Delete existing A records
4. Add new CNAME/A record

### Namecheap
1. Login → Domain List → Manage
2. Advanced DNS tab
3. Delete www A records
4. Add new record

### Cloudflare
1. Login → Select domain
2. DNS tab
3. Delete www A records
4. Add new record
5. ⚠️ Ensure "Proxy status" is OFF (DNS only)

### Google Domains
1. Login → My domains → DNS
2. Custom resource records
3. Delete www A records
4. Add new record

---

## 🎯 Final URLs After Setup

### Primary Domain:
- https://www.tryfairfareapp.com

### Alternative Access:
- https://tryfairfareapp.com (if you set up redirect)
- [Emergent production URL] (backup)

### Recommendation:
Set up 301 redirect from bare domain (tryfairfareapp.com) to www subdomain at your DNS provider.

---

## 📊 What Happens After DNS Setup

### Immediate (0-5 minutes):
- DNS servers start updating
- Some users can access site

### Short-term (5-15 minutes):
- Most DNS servers updated
- Majority of users can access
- May still see old site on some devices

### Complete (15 minutes - 24 hours):
- Global DNS propagation complete
- All users worldwide can access
- SSL certificate auto-issued

---

## 🔒 SSL Certificate

**Automatic:**
- Emergent automatically provisions SSL certificate
- No action needed from you
- Takes 5-10 minutes after DNS propagates
- Your site will be https:// automatically

---

## 💡 Pro Tips

### Faster Propagation:
1. **Lower TTL before changes** (if planning ahead)
2. **Use DNS checker tools** to monitor
3. **Test in incognito mode** (avoids cache)

### Best Practices:
- ✅ Keep backup of old DNS settings
- ✅ Make changes during low-traffic hours
- ✅ Document what you changed
- ✅ Test thoroughly before announcing

---

## 🆘 Troubleshooting Guide

### Issue: Domain not loading after 24 hours

**Check:**
1. DNS records match exactly what Emergent provided
2. No typos in CNAME/A record values
3. All A records removed
4. DNS propagation complete (use checker tools)

**Action:**
- Contact Emergent support
- Provide domain name and deployment ID

---

### Issue: Site loads but shows "Not Secure"

**Explanation:**
- SSL certificate still provisioning
- Usually takes 10-15 minutes after DNS propagates

**Action:**
- Wait up to 1 hour
- Try https:// explicitly
- Clear browser cache

---

### Issue: Some users see old site

**Explanation:**
- Local DNS cache not cleared
- ISP DNS cache not updated

**Action:**
- Wait for propagation
- Users can flush DNS (ipconfig /flushdns on Windows)
- Try different network (mobile data vs WiFi)

---

## 📞 Support Channels

### Need Help?
- **Emergent Support:** Contact through dashboard
- **DNS Issues:** Your domain registrar support
- **App Issues:** Review test reports in /app/test_reports/

---

## ✅ Pre-Deployment Checklist

Before starting DNS setup:

- [ ] App deployed successfully
- [ ] Production URL working
- [ ] "Link domain" option visible in Emergent
- [ ] Access to domain registrar account
- [ ] Backup of current DNS settings
- [ ] Ready to remove existing A records

---

## 🎉 Success Indicators

Your domain is properly configured when:

- ✅ https://www.tryfairfareapp.com loads FairFare
- ✅ Green padlock (SSL) in browser
- ✅ All features work (GPS, autocomplete, comparison)
- ✅ PWA installable from custom domain
- ✅ No certificate warnings
- ✅ Loads on mobile devices

---

## 📝 Summary

**Process:**
1. Deploy app (10-15 min)
2. Link domain → Get DNS records
3. Remove old A records at registrar
4. Add CNAME/A record from Emergent
5. Wait 5-15 minutes
6. Test at www.tryfairfareapp.com
7. Done! 🎉

**Your FairFare app will be live at:**
### https://www.tryfairfareapp.com

Ready to deploy when you are!
