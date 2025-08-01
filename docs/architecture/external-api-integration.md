# External API Integration

## OpenAI API
- **Purpose:** AI-assisted code generation and natural language query processing
- **Documentation:** https://platform.openai.com/docs
- **Base URL:** https://api.openai.com/v1
- **Authentication:** API Key with secure storage
- **Integration Method:** REST client with rate limiting and error handling

**Key Endpoints Used:**
- `POST /chat/completions` - Natural language to code generation
- `POST /embeddings` - Function similarity and search

**Error Handling:** Graceful degradation when AI services unavailable, local fallback for basic code completion

## Azure Active Directory API
- **Purpose:** Enterprise SSO authentication and user management
- **Documentation:** https://docs.microsoft.com/en-us/azure/active-directory/
- **Base URL:** https://login.microsoftonline.com
- **Authentication:** OAuth 2.0 with PKCE
- **Integration Method:** MSAL library integration with token caching

**Key Endpoints Used:**
- `POST /oauth2/v2.0/token` - Token acquisition and refresh
- `GET /v1.0/me` - User profile information

**Error Handling:** Fallback to local authentication when Azure AD unavailable
