#!/bin/bash

# Generate self-signed SSL certificates for HTTPS
CERT_DIR="$(dirname "$0")/certs"

# Create certs directory if not exists
mkdir -p "$CERT_DIR"

echo "Generating SSL certificates..."

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -subj "/C=CN/ST=State/L=City/O=Hermes/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

echo "✓ SSL certificates generated:"
echo "  - $CERT_DIR/key.pem"
echo "  - $CERT_DIR/cert.pem"

echo ""
echo "To trust the certificate on macOS:"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERT_DIR/cert.pem"
