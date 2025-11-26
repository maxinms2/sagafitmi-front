#!/bin/sh
# Generate a small JS file that the app reads at runtime to get env vars
cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:8081}"
}
EOF

exec nginx -g 'daemon off;'
