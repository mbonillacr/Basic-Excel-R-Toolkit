# Source Tree Integration

## Existing Project Structure
```
Basic-Excel-R-Toolkit/
├── BERT/                    # C++ Excel Add-in
├── Console/                 # TypeScript Electron Console
├── ControlR/               # R Language Controller
├── ControlJulia/           # Julia Language Controller
├── Ribbon/                 # Excel Ribbon Interface
├── Examples/               # Sample functions
├── Build/                  # Build output directory
└── README.md
```

## New File Organization
```
Basic-Excel-R-Toolkit/
├── BERT/                           # Existing C++ Excel Add-in (preserved)
├── Console/                        # Enhanced Electron Console
│   ├── src/
│   │   ├── components/            # New React components
│   │   ├── services/              # API client services
│   │   └── legacy/                # Existing TypeScript modules
├── services/                       # New microservices directory
│   ├── api-gateway/               # API Gateway service
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── r-service/                 # R Language Service
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── julia-service/             # Julia Language Service
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── Project.toml
│   └── legacy-adapter/            # Legacy COM Adapter
│       ├── src/
│       └── CMakeLists.txt
├── web-clients/                    # New web-based clients
│   ├── excel-online/              # Excel Online Add-in
│   ├── google-sheets/             # Google Sheets Add-on
│   └── web-console/               # PWA Console
├── infrastructure/                 # New deployment infrastructure
│   ├── docker-compose.yml
│   ├── kubernetes/
│   └── terraform/
├── docs/                          # Enhanced documentation
│   ├── prd.md                     # Product Requirements
│   ├── architecture.md            # This document
│   └── api/                       # API documentation
├── .github/                       # New CI/CD workflows
│   └── workflows/
└── tests/                         # New comprehensive test suite
    ├── unit/
    ├── integration/
    └── e2e/
```

## Integration Guidelines
- **File Naming:** Maintain existing C++ conventions (PascalCase), use kebab-case for new services, camelCase for TypeScript
- **Folder Organization:** Preserve existing monorepo structure, add new service directories with clear separation
- **Import/Export Patterns:** Maintain existing module patterns, use ES6 imports for new TypeScript/JavaScript code
