#!/bin/bash

# =============================
# STRAPI FULL MIGRATION SCRIPT
# Supports: Azure, Media, Rename, All Content Types
# =============================

# Configure your environments
declare -A ENV_URLS
declare -A ENV_TOKENS
declare -A ENV_PREFIXES

# URLs for each environment
ENV_URLS["local"]="http://localhost:1337/admin"
ENV_URLS["dev"]="https://techved-fgili-strapi-axdmg7dtc7fnh2c9.centralindia-01.azurewebsites.net/admin"
ENV_URLS["uat"]="https://corporatewebsitecms.azurewebsites.net/admin"
ENV_URLS["prod"]="https://corporatewebsitecmsprod-b2bwf7bcf6bagcc6.southindia-01.azurewebsites.net/admin"

# Tokens for each environment (ideally read from secure env)
ENV_TOKENS["local"]="66fb6e45e6146043419d16ab4d3f4f8d834699f940e704a41fad826ea02f74ab558675ef109828f8cb2035dc9c95df670e2d6110493f29a50d50c7cd5d103e5ef7c3f553e09245f05a8deb556430ee61c6b3f2c2226d0d3e730e5c1d833a9d0e7d5c21b18f33454a83f37f9eb197ddf8df1c87f213e715120aaf43a02af86a39"
ENV_TOKENS["dev"]="f8a8744be93beece3ed6e10a67b05e63b8ac2d6229cadfa3c4c0f6aebffd3aef9fff6816ba8ed1eb689d467124385445a238b0a12a749ad932358ac3355db0c62adb62f1e6cbbd25b893475c8cc737ed93c0692f0eeb66adf187adc612d2daecd140e040239b77da4a49dc59cf76e0cd18905e778214ed4ed5f504c5a4c17da1"
ENV_TOKENS["uat"]="dc230a738cc8954d29b624ffc886daad485345bb6f77af60c085fe8a04a0fbb63b2afb29d03e16cdec2401c05f2632128f3cd74b043afe6c291e8abc9166cd2ff60dc91c481e63baccd34277c61170eefc6ce7678ba938aae70aaeccb27ebf033cb785e9c3db67176a84197b58e36d6f7600cbe8b6664111ae6f5ec51798b004"
ENV_TOKENS["prod"]="ce9a4f20b6e9b2004000fe37686486a066cea2dc5a84fe69f77a89ec418d949a8be97e36f5838e9885651c64cb63460d781010735958a0502f1a7c312019e5e015c091e9ae9fa5357698634fb4f9c74a380df6433cd08c293618a87259930591e1ae74fcddf997a5040a8c8793f321c51c2df98b36ef519be6cc24b1bb511dcc"

# Prefix to rename files (optional)
ENV_PREFIXES["local"]="local"
ENV_PREFIXES["dev"]="dev"
ENV_PREFIXES["uat"]="uat"
ENV_PREFIXES["prod"]="prod"

# Step 1: Prompt for environments
echo "Available environments: local, dev, uat, prod"
read -p "Enter source environment (from): " FROM
read -p "Enter destination environment (to): " TO

# Step 2: Validate
if [ -z "${ENV_URLS[$FROM]}" ] || [ -z "${ENV_URLS[$TO]}" ]; then
  echo "❌ Invalid environment selection."
  exit 1
fi

# Step 3: Ask for content types
read -p "Migrate ALL content types? (y/n): " ALL_TYPES
CONTENT_TYPES=()
if [[ "$ALL_TYPES" != "y" ]]; then
  read -p "Enter comma-separated content types (e.g., article,page): " CTYPES
  IFS=',' read -ra CONTENT_TYPES <<< "$CTYPES"
fi

# Step 4: File rename choice
# read -p "Rename transferred Azure media files with environment suffix? (y/n): " RENAME_FILES

FROM_URL="${ENV_URLS[$FROM]}"
TO_URL="${ENV_URLS[$TO]}"
FROM_TOKEN="${ENV_TOKENS[$FROM]}"
TO_TOKEN="${ENV_TOKENS[$TO]}"
TO_PREFIX="${ENV_PREFIXES[$TO]}"

# Step 5: Transfer command
TRANSFER_CMD="yarn strapi transfer --from \"$FROM_URL\" --from-token \"$FROM_TOKEN\" --to \"$TO_URL\" --to-token \"$TO_TOKEN\" --force --verbose"

if [[ "$ALL_TYPES" != "y" ]]; then
  for ct in "${CONTENT_TYPES[@]}"; do
    TRANSFER_CMD+=" --only \"$ct\""
  done
fi

# Step 6: Confirm and execute
echo ""
echo "Summary:"
echo "🔄 From: $FROM → $TO"
echo "📦 Content types: ${CONTENT_TYPES[*]:-ALL}"
# echo "📁 Media rename: $RENAME_FILES"
read -p "Proceed? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  echo "🚫 Cancelled."
  exit 0
fi

echo "🚀 Transferring content and media..."
eval $TRANSFER_CMD

if [[ $? -ne 0 ]]; then
  echo "❌ Transfer failed."
  exit 1
fi

echo "✅ Migration complete from $FROM → $TO."
