#!/bin/bash

# ============================================
# Bengali Font Installation Script
# Installs SutonnyMJ font system-wide for proper Bengali rendering
# Fixes joint letter breaking issues in browsers and applications
# ============================================

set -e  # Exit on error

echo "🔧 Bengali Font Installation Script"
echo "==================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script requires root privileges."
    echo "Please run with: sudo ./install-bengali-font-systemwide.sh"
    exit 1
fi

# Variables
FONT_NAME="SutonnyMJ"
FONT_FILE="SutonnyMJ Regular.ttf"
FONT_SOURCE="./$FONT_FILE"
FONT_DIR_SYSTEM="/usr/share/fonts/truetype/$FONT_NAME"
FONT_DIR_USER="/home/$SUDO_USER/.local/share/fonts"
BACKUP_DIR="/tmp/font-backup-$(date +%Y%m%d-%H%M%S)"

# Check if font file exists
if [ ! -f "$FONT_SOURCE" ]; then
    echo "❌ Error: Font file '$FONT_FILE' not found in current directory!"
    echo "Please make sure you're in the project directory containing the font file."
    exit 1
fi

echo "📁 Found font file: $FONT_FILE"
echo "📊 Font details:"
file "$FONT_SOURCE"
echo ""

# Create backup of existing font configurations
echo "📦 Creating backup of existing font configurations..."
mkdir -p "$BACKUP_DIR"
cp -r /etc/fonts/ "$BACKUP_DIR/etc-fonts/" 2>/dev/null || true
cp -r /usr/share/fonts/ "$BACKUP_DIR/system-fonts/" 2>/dev/null || true
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# ============================================
# STEP 1: Install font system-wide
# ============================================
echo "🚀 STEP 1: Installing font system-wide..."

# Create system font directory
mkdir -p "$FONT_DIR_SYSTEM"

# Copy font file
cp "$FONT_SOURCE" "$FONT_DIR_SYSTEM/"

# Set proper permissions
chmod 644 "$FONT_DIR_SYSTEM/$FONT_FILE"
chown root:root "$FONT_DIR_SYSTEM/$FONT_FILE"

echo "✅ Font installed to: $FONT_DIR_SYSTEM"
echo ""

# ============================================
# STEP 2: Install font for current user
# ============================================
echo "👤 STEP 2: Installing font for user: $SUDO_USER..."

# Create user font directory
mkdir -p "$FONT_DIR_USER"

# Copy font file
cp "$FONT_SOURCE" "$FONT_DIR_USER/"

# Set proper permissions
chmod 644 "$FONT_DIR_USER/$FONT_FILE"
chown "$SUDO_USER:$SUDO_USER" "$FONT_DIR_USER/$FONT_FILE"

echo "✅ Font installed to: $FONT_DIR_USER"
echo ""

# ============================================
# STEP 3: Update font cache
# ============================================
echo "🔄 STEP 3: Updating font cache..."

# Update system font cache
fc-cache -f -v

# Update user font cache (run as user)
sudo -u "$SUDO_USER" fc-cache -f -v

echo "✅ Font cache updated"
echo ""

# ============================================
# STEP 4: Configure fontconfig for Bengali
# ============================================
echo "⚙️  STEP 4: Configuring fontconfig for Bengali rendering..."

# Create fontconfig configuration for Bengali
FONTCONFIG_FILE="/etc/fonts/conf.d/65-bengali-fonts.conf"

cat > "$FONTCONFIG_FILE" << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- Bengali font preferences -->
  <alias>
    <family>serif</family>
    <prefer>
      <family>SutonnyMJ</family>
      <family>Lohit Bengali</family>
      <family>FreeSerif</family>
      <family>Noto Serif Bengali</family>
      <family>Kalpurush</family>
      <family>SolaimanLipi</family>
    </prefer>
  </alias>
  
  <alias>
    <family>sans-serif</family>
    <prefer>
      <family>SutonnyMJ</family>
      <family>Lohit Bengali</family>
      <family>FreeSans</family>
      <family>Noto Sans Bengali</family>
      <family>Kalpurush</family>
      <family>SolaimanLipi</family>
    </prefer>
  </alias>
  
  <alias>
    <family>monospace</family>
    <prefer>
      <family>SutonnyMJ</family>
      <family>Lohit Bengali</family>
      <family>FreeMono</family>
      <family>Noto Sans Mono Bengali</family>
    </prefer>
  </alias>
  
  <!-- Force SutonnyMJ for Bengali script -->
  <match target="pattern">
    <test name="lang" compare="contains">
      <string>bn</string>
    </test>
    <test name="family">
      <string>serif</string>
    </test>
    <edit name="family" mode="prepend" binding="strong">
      <string>SutonnyMJ</string>
    </edit>
  </match>
  
  <match target="pattern">
    <test name="lang" compare="contains">
      <string>bn</string>
    </test>
    <test name="family">
      <string>sans-serif</string>
    </test>
    <edit name="family" mode="prepend" binding="strong">
      <string>SutonnyMJ</string>
    </edit>
  </match>
  
  <!-- Improve hinting and antialiasing for Bengali -->
  <match target="font">
    <edit name="hinting" mode="assign">
      <bool>true</bool>
    </edit>
    <edit name="hintstyle" mode="assign">
      <const>hintslight</const>
    </edit>
    <edit name="antialias" mode="assign">
      <bool>true</bool>
    </edit>
    <edit name="rgba" mode="assign">
      <const>rgb</const>
    </edit>
    <edit name="lcdfilter" mode="assign">
      <const>lcddefault</const>
    </edit>
  </match>
  
  <!-- Specific settings for SutonnyMJ -->
  <match target="font">
    <test name="family" compare="eq">
      <string>SutonnyMJ</string>
    </test>
    <edit name="embeddedbitmap" mode="assign">
      <bool>false</bool>
    </edit>
    <edit name="autohint" mode="assign">
      <bool>false</bool>
    </edit>
  </match>
</fontconfig>
EOF

echo "✅ Fontconfig configuration created: $FONTCONFIG_FILE"
echo ""

# ============================================
# STEP 5: Install additional Bengali fonts
# ============================================
echo "📚 STEP 5: Installing additional Bengali fonts for fallback..."

# Check if apt is available
if command -v apt &> /dev/null; then
    echo "📦 Installing Bengali fonts from repositories..."
    apt update
    apt install -y \
        fonts-beng \
        fonts-beng-extra \
        fonts-lohit-beng-bengali \
        fonts-noto-bengali \
        fonts-kalapi \
        ttf-devanagari-fonts
    
    echo "✅ Additional Bengali fonts installed"
else
    echo "⚠️  APT not found, skipping additional font installation"
    echo "   You can manually install Bengali fonts from your package manager"
fi
echo ""

# ============================================
# STEP 6: Configure browser font settings
# ============================================
echo "🌐 STEP 6: Configuring browser font settings..."

# Create browser CSS for font testing
BROWSER_TEST_FILE="/tmp/bengali-font-test.html"

cat > "$BROWSER_TEST_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>বাংলা ফন্ট টেস্ট - Bengali Font Test</title>
    <style>
        body {
            font-family: 'SutonnyMJ', 'Kalpurush', 'SolaimanLipi', 'Lohit Bengali', 'Noto Sans Bengali', sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.8;
            background: #f5f5f5;
        }
        .test-section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        .font-sample {
            font-size: 24px;
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #3498db;
        }
        .joint-letters {
            font-size: 28px;
            color: #e74c3c;
            font-weight: bold;
        }
        .success {
            color: #27ae60;
            font-weight: bold;
        }
        .info {
            background: #d6eaf8;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <h1>বাংলা ফন্ট টেস্ট পেজ - Bengali Font Test Page</h1>
    
    <div class="info">
        <p>এই পৃষ্ঠাটি আপনার সিস্টেমে বাংলা ফন্ট সঠিকভাবে কাজ করছে কিনা তা পরীক্ষা করার জন্য।</p>
        <p>This page tests if Bengali fonts are working correctly on your system.</p>
    </div>
    
    <div class="test-section">
        <h2>ফন্ট পরীক্ষা - Font Test</h2>
        
        <div class="font-sample">
            <h3>সাধারণ বাংলা টেক্সট - Regular Bengali Text:</h3>
            <p>বাংলাদেশ দক্ষিণ এশিয়ার একটি রাষ্ট্র। দেশের সরকারি নাম গণপ্রজাতন্ত্রী বাংলাদেশ।</p>
            <p>বাংলা ভাষা বাংলাদেশের রাষ্ট্রভাষা। বাংলা বর্ণমালা বিশ্বের পঞ্চম সর্বাধিক ব্যবহৃত লিখন পদ্ধতি।</p>
        </div>
        
        <div class="font-sample">
            <h3>যুক্তাক্ষর টেস্ট - Joint Letters Test:</h3>
            <p class="joint-letters">ক্ষ্ম, হ্ণ, হ্ন, হ্ম, ক্ত, ক্ট্র, ক্ত্য, ক্ত্র, ক্ত্ব, ক্ত্ম</p>
            <p class="joint-letters">ক্ত, ক্ত্র, ক্ত্য, ক্ত্ব, ক্ত্ম, ক্ত্র, ক্ত্য, ক্ত্ব, ক্ত্ম</p>
            <p class="joint-letters">স্ক, স্ফ, স্ন, স্ম, স্ল, স্ত, স্ত্র, স্ত্য, স্ত্ব, স্ত্ম</p>
        </div>
        
        <div class="font-sample">
            <h3>সংখ্যা ও তারিখ - Numbers & Dates:</h3>
            <p>আজ ৭ জানুয়ারি, ২০২৬। সময় সকাল ১১:৫২।</p>
            <p>মোবাইল নম্বর: ০১৭১১-২৩৪৫৬৭</p>
            <p>টাকা: ১,২৩৪.৫৬ টাকা</p>
        </div>
        
        <div class="font-sample">
            <h3>বাক্য গঠন - Sentence Formation:</h3>
            <p>আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।</p>
            <p>চিরদিন তোমার আকাশ, তোমার বাতাস, আমার প্রাণে বাজায় বাঁশি।</p>
            <p>ও মা, ফাগুনে তোর আমের বনে ঘ্রাণে পাগল করে।</p>
        </div>
    </div>
    
    <div class="test-section">
        <h2>ফন্ট তালিকা - Font List</h2>
        <p>নিম্নলিখিত ফন্টগুলো আপনার সিস্টেমে ইনস্টল করা হয়েছে:</p>
        <ul>
            <li style="font-family: 'SutonnyMJ';">SutonnyMJ - সুতন্বী এমজে</li>
            <li style="font-family: 'Kalpurush';">Kalpurush - কালপুরুষ</li>
            <li style="font-family: 'SolaimanLipi';">SolaimanLipi - সোলaimanলিপি</li>
            <li style="font-family: 'Lohit Bengali';">Lohit Bengali - লোহিত বাংলা</li>
            <li style="font-family: 'Noto Sans Bengali';">Noto Sans Bengali - নোটো স্যান্স বাংলা</li>
        </ul>
    </div>
    
    <div class="test-section success">
        <h2>✅ পরীক্ষা সফল - Test Successful</h2>
        <p>যদি আপনি উপরের সব বাংলা টেক্সট স্পষ্ট এবং যুক্তাক্ষরগুলো ভাঙ্গা ছাড়া দেখতে পান, তাহলে আপনার বাংলা ফন্ট সঠিকভাবে কাজ করছে।</p>
        <p>If you can see all Bengali text clearly without broken joint letters, your Bengali fonts are working correctly.</p>
    </div>
    
    <div class="test-section">
        <h2>সমস্যা সমাধান - Troubleshooting</h2>
        <p>যদি বাংলা টেক্সট ভাঙ্গা দেখায়:</p>
        <ol>
            <li>ব্রাউজার রিস্টার্ট করুন</li>
            <li>সিস্টেম রিস্টার্ট করুন</li>
            <li>ফন্ট ক্যাশে ক্লিয়ার করুন: <code>fc-cache -f -v</code></li>
            <li>ব্রাউজারের ক্যাশে ক্লিয়ার করুন</li>
        </ol>
    </div>
    
    <footer style="text-align: center; margin-top: 40px; color: #7f8c8d; font-size: 14px;">
        <p>বাংলা ফন্ট ইনস্টলেশন স্ক্রিপ্ট দ্বারা তৈরি - Created by Bengali Font Installation Script</p>
        <p>© 2026 - ল্যাবইনিশিয়াল POS সিস্টেম - Labinitial POS System</p>
    </footer>
</body>
</html>
EOF

echo "✅ Browser test page created: $BROWSER_TEST_FILE"
echo ""

# ============================================
# STEP 7: Create desktop shortcut for testing
# ============================================
echo "🖥️  STEP 7: Creating desktop shortcut..."

DESKTOP_FILE="/home/$SUDO_USER/Desktop/Bengali-Font-Test.desktop"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Bengali Font Test
Comment=Test Bengali font rendering
Exec=xdg-open "$BROWSER_TEST_FILE"
Icon=preferences-desktop-font
Terminal=false
Categories=Utility;System;
EOF

chmod +x "$DESKTOP_FILE"
chown "$SUDO_USER:$SUDO_USER" "$DESKTOP_FILE"

echo "✅ Desktop shortcut created: $DESKTOP_FILE"
echo ""

# ============================================
# STEP 8: Verify installation
# ============================================
echo "🔍 STEP 8: Verifying installation..."

# Check if font is detected
echo "📋 Checking font detection..."
if fc-list | grep -i "SutonnyMJ" > /dev/null; then
    echo "✅ SutonnyMJ font detected by system"
else
    echo "⚠️  SutonnyMJ font not detected. Trying to force cache update..."
    fc-cache -f -v
fi

# Show font information
echo ""
echo "📊 Installed Bengali fonts:"
fc-list | grep -i "bengali\|bangla\|bn:" | sort | uniq

echo ""
echo "🔤 SutonnyMJ font details:"
fc-match "SutonnyMJ"

echo ""
echo "🌐 Testing with sample Bengali text:"
echo "বাংলাদেশের রাজধানী ঢাকা। বাংলা ভাষা বাংলাদেশের রাষ্ট্রভাষা।"

# ============================================
# STEP 9: Create restart script
# ============================================
echo ""
echo "🔄 STEP 9: Creating restart script..."

RESTART_SCRIPT="/home/$SUDO_USER/restart-font-services.sh"

cat > "$RESTART_SCRIPT" << 'EOF'
#!/bin/bash
# Script to restart font services

echo "Restarting font services..."

# Update font cache
sudo fc-cache -f -v

# Restart display manager (adjust based on your DM)
if systemctl is-active --quiet gdm3; then
    echo "Restarting GDM3..."
    sudo systemctl restart gdm3
elif systemctl is-active --quiet lightdm; then
    echo "Restarting LightDM..."
    sudo systemctl restart lightdm
elif systemctl is-active --quiet sddm; then
    echo "Restarting
