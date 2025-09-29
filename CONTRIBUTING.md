# Contributing to Keytar

Thank you for considering contributing to Keytar! While this project is not actively maintained, useful contributions from the community are welcome.

## Important Context

Before contributing, please understand:
- Keytar is a **development tool**, not a security product
- It intentionally has **zero security** by design
- The goal is to remain **lightweight and simple**
- **Developer convenience** is prioritized over features

## What We're Looking For

### ✅ Good Contributions
- Bug fixes that affect development workflows
- Compatibility improvements with Keycloak configs
- Better error messages for developers
- Documentation improvements and clarifications
- Additional warnings about security implications
- Support for more Keycloak realm configuration fields (without adding complexity)

### ❌ What Won't Be Accepted
- Security features (defeats the purpose)
- Authentication mechanisms (use real SSO instead)
- Production-oriented features
- Complex configuration systems
- Database integration
- Session management
- Features that significantly increase complexity or size

## How to Contribute

### 1. Check First
- Search existing issues and PRs to avoid duplicates
- For major changes, open an issue first to discuss

### 2. Fork and Branch
Fork the repository on GitHub, then:
```bash
git clone https://github.com/<your-github-username>/keytar.git
cd keytar
git remote add upstream https://github.com/makenai/keytar.git
git checkout -b feature/your-feature-name
```

### 3. Development Setup
```bash
npm install
npm start
```

### 4. Make Your Changes
- Keep changes focused and minimal
- Follow the existing code style
- Don't add unnecessary dependencies
- Ensure the Docker image remains small

### 5. Test Your Changes
Test both modes:
```bash
# Standalone mode
PORT=8020 npm start

# Docker mode
npm run docker:build
docker run -p 8020:8020 keytar:latest

# As Keycloak replacement
docker-compose up # with your test compose file
```

Verify:
- User selection UI works
- Tokens are generated correctly
- Keycloak compatibility paths work
- Existing configurations still work

### 6. Update Documentation
- Update README.md if adding features
- Add warnings if introducing any behavior that could be misused
- Document environment variables or configuration options

### 7. Submit Pull Request
- Use a clear, descriptive title
- Explain the problem you're solving
- Reference any related issues
- Include test instructions

## Code Style

- Use 2-space indentation
- Keep lines under 120 characters
- Use meaningful variable names
- Add comments for non-obvious logic
- Prefer simplicity over cleverness

## Testing Checklist

Before submitting, verify:
- [ ] Server starts without errors
- [ ] User selection interface loads
- [ ] Tokens are generated with correct structure
- [ ] `/get-token` endpoint works
- [ ] `/userinfo` endpoint returns data
- [ ] Docker image builds successfully
- [ ] Keycloak replacement mode works
- [ ] No production-oriented features added
- [ ] Security warnings are still prominent

## Security Considerations

Remember: **Keytar has no security by design**

If your contribution might be misunderstood as adding security:
1. Add clear warnings in code comments
2. Update documentation to clarify the lack of security
3. Ensure tokens still contain `MOCK_SSO_DEVELOPMENT: true`

## Questions?

Open an issue with the `question` label if you need clarification.

## License

By contributing, you agree that your contributions will be licensed under the MIT License with the project's additional disclaimers.

## Final Notes

Contributions that keep Keytar useful for development while maintaining its core principle are appreciated: **zero security for maximum development convenience**.

If you need actual security features, please use Keycloak or another real SSO solution instead of trying to add them to Keytar.