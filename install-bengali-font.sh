#!/bin/bash

# Bengali Font Installation Script
# Installs SutonnyMJ font system-wide for proper Bengali rendering

echo "🔧 Bengali Font Installation Script"
echo "==================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run with: sudo ./install-bengali-font.sh"
    exit 1
fi

# Check font file
FONT_FILE="SutonnyMJ Regular.ttf"
if [ ! -f "$FONT_FILE" ]; then
    echo "❌ Font file '$FONT_FILE' not found!"
    exit 1
fi

echo "📁 Installing SutonnyMJ font..."

# Install system-wide
mkdir -p /usr/share/fonts/truetype/SutonnyMJ
cp "$FONT_FILE" /usr/share/fonts/truetype/SutonnyMJ/
chmod 644 /usr/share/fonts/truetype/SutonnyMJ/"$FONT_FILE"

# Install for current user
USER_HOME="/home/$SUDO_USER"
mkdir -p "$USER_HOME/.local/share/fonts"
cp "$FONT_FILE" "$USER_HOME/.local/share/fonts/"
chmod 644 "$USER_HOME/.local/share/fonts/$FONT_FILE"
chown "$SUDO_USER:$SUDO_USER" "$USER_HOME/.local/share/fonts/$FONT_FILE"

# Update font cache
echo "🔄 Updating font cache..."
fc-cache -f -v
sudo -u "$SUDO_USER" fc-cache -f -v

# Create fontconfig
cat > /etc/fonts/conf.d/65-bengali-sutonny.conf << 'EOF'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <alias>
    <family>serif</family>
    <prefer><family>SutonnyMJ</family></prefer>
  </alias>
  <alias>
    <family>sans-serif</family>
    <prefer><family>SutonnyMJ</family></prefer>
  </alias>
  <match target="pattern">
    <test name="lang" compare="contains"><string>bn</string></test>
    <edit name="family" mode="prepend" binding="strong">
      <string>SutonnyMJ</string>
    </edit>
  </match>
</fontconfig>
EOF

# Install additional Bengali fonts if apt is available
if command -v apt &> /dev/null; then
    echo "📦 Installing additional Bengali fonts..."
    apt update
    apt install -y fonts-beng fonts-noto-bengali fonts-lohit-beng-bengali
fi

# Create test HTML
cat > /tmp/bengali-test.html << 'EOF'
<!DOCTYPE html>
<html lang="bn">
<head><meta charset="UTF-8"><title>বাংলা টেস্ট</title>
<style>body{font-family:'SutonnyMJ',sans-serif; padding:20px;}</style>
</head>
<body>
<h1>বাংলা ফন্ট টেস্ট</h1>
<p>বাংলাদেশ দক্ষিণ এশিয়ার একটি রাষ্ট্র।</p>
<p>যুক্তাক্ষর: ক্ষ্ম হ্ণ হ্ন হ্ম ক্ত স্ক স্ফ স্ন স্ম</p>
<p>আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।</p>
</body>
</html>
EOF

echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your computer"
echo "2. Open test page: /tmp/bengali-test.html"
echo "3. Test in browser and other applications"
echo ""
echo "🔤 Verify with: fc-list | grep -i sutonny"
