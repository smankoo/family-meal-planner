# Security Guidelines

This document outlines the security measures implemented in this project to prevent API key leaks and other security vulnerabilities.

## Pre-Commit Hooks

We use comprehensive pre-commit hooks to prevent secrets from being committed to the repository:

### 1. Basic Security Checks
- **Private Key Detection**: Detects SSH private keys and other private key formats
- **Large File Prevention**: Prevents files larger than 1MB from being committed
- **File Format Validation**: Validates YAML and JSON syntax

### 2. Advanced Secret Detection (detect-secrets)
- **High Entropy String Detection**: Identifies strings with high randomness that could be secrets
- **Pattern Matching**: Detects known secret patterns (API keys, tokens, passwords)
- **Baseline Management**: Uses `.secrets.baseline` to track known false positives

### 3. Custom API Key Detection
- **Google API Keys**: `AIza[0-9A-Za-z_-]{35}`
- **AWS Keys**: `AKIA[0-9A-Z]{16}` and secret access keys
- **GitHub Tokens**: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` prefixed tokens
- **OpenAI Keys**: `sk-[0-9a-zA-Z]{48}`
- **Stripe Keys**: Live and test keys for both secret and publishable keys
- **Generic Patterns**: API_KEY, TOKEN, SECRET, PASSWORD assignments

## Environment Variable Management

### Safe Practices
✅ **DO:**
- Store secrets in `.env.local` (already in `.gitignore`)
- Use environment variables in production
- Use `PLACEHOLDER_API_KEY` for placeholder values
- Reference secrets via `process.env.VARIABLE_NAME` or `os.getenv("VARIABLE_NAME")`

❌ **DON'T:**
- Hardcode API keys in source code
- Commit `.env` files with real secrets
- Use non-standard environment file names (like `backend.env`)
- Store secrets in configuration files

### Environment File Hierarchy
1. `.env.local` - Local development (gitignored)
2. `.env.production` - Production secrets (gitignored)
3. `.env` - Default values and placeholders (can be committed if no real secrets)

## Git Configuration

### Protected Files
The following files are automatically excluded from commits:
- `*.env` - All environment files
- `.env.*` - Environment files with any suffix
- `package-lock.json` - Excluded from secret scanning (contains SHA hashes)
- `node_modules/` - Dependencies
- `dist/` - Build artifacts
- `.git/` - Git metadata

### Baseline Management
If you encounter false positives:

```bash
# Add false positives to baseline
detect-secrets scan . > .secrets.baseline

# Audit the baseline to mark secrets as real or false positives
detect-secrets audit .secrets.baseline
```

## Installation & Setup

### Prerequisites
```bash
# Install uv (our Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install required tools
uv tool install detect-secrets
uv tool install pre-commit
```

### Setup Pre-commit Hooks
```bash
# Install the hooks
pre-commit install

# Test all hooks
pre-commit run --all-files

# Test specific hook
pre-commit run detect-secrets --all-files
```

## Incident Response

### If a Secret is Detected
1. **Stop the commit** - The hooks will prevent the commit automatically
2. **Remove the secret** from the code
3. **Move to environment variable** - Store in `.env.local`
4. **Revoke the compromised secret** if it was real
5. **Generate a new secret** if needed

### If a Secret was Already Committed
1. **Immediately revoke** the compromised secret
2. **Generate a new secret**
3. **Clean git history** (optional but recommended):
   ```bash
   # Use BFG Repo-Cleaner or git filter-branch
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```
4. **Force push** to update remote repository
5. **Notify team members** to re-clone the repository

## API Key Leak Prevention Checklist

- [ ] Pre-commit hooks installed and working
- [ ] All secrets stored in `.env.local`
- [ ] No hardcoded API keys in source code
- [ ] `.gitignore` includes all environment files
- [ ] Team members trained on security practices
- [ ] Regular security audits performed
- [ ] Incident response plan documented

## Monitoring & Alerts

### GitHub Security Features
- Enable **secret scanning** in repository settings
- Enable **push protection** to prevent secret commits
- Review **security advisories** regularly

### Best Practices
- Rotate API keys regularly
- Use least-privilege access principles
- Monitor API usage for unusual patterns
- Set up alerts for failed authentication attempts

## Contact

For security concerns or questions, please:
1. Create an issue with the `security` label
2. Follow responsible disclosure practices
3. Do not include actual secrets in issue descriptions

---

**Remember**: Security is everyone's responsibility. When in doubt, ask for help rather than risk exposing sensitive information.
