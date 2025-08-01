const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const app = express();
app.use(express.json());

// AI Service Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'ai-service.log' }),
    new winston.transports.Console()
  ]
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many AI requests, please try again later'
});

app.use('/ai/', limiter);

// Code Generation Templates
const CODE_TEMPLATES = {
  r: {
    dataAnalysis: `# Data analysis function
analyze_data <- function(data) {
  # Summary statistics
  summary_stats <- summary(data)
  
  # Basic visualization
  plot(data)
  
  return(summary_stats)
}`,
    visualization: `# Data visualization function
create_plot <- function(data, x_col, y_col) {
  library(ggplot2)
  
  ggplot(data, aes_string(x = x_col, y = y_col)) +
    geom_point() +
    theme_minimal()
}`
  },
  julia: {
    dataAnalysis: `# Data analysis function
function analyze_data(data)
    # Summary statistics
    summary_stats = describe(data)
    
    # Basic visualization
    plot(data)
    
    return summary_stats
end`,
    visualization: `# Data visualization function
function create_plot(data, x_col, y_col)
    using Plots
    
    scatter(data[!, x_col], data[!, y_col],
           title="Data Visualization",
           xlabel=string(x_col),
           ylabel=string(y_col))
end`
  }
};

// Natural Language to Code Generation
app.post('/ai/generate-code', async (req, res) => {
  try {
    const { prompt, language, context } = req.body;
    
    if (!prompt || !language) {
      return res.status(400).json({ error: 'Prompt and language are required' });
    }

    // Enhanced prompt with BERT context
    const enhancedPrompt = `
Generate ${language.toUpperCase()} code for BERT (Excel integration) based on this request: "${prompt}"

Context: ${context || 'Excel data analysis'}
Requirements:
- Code should work with Excel data structures
- Include error handling
- Add comments explaining the logic
- Ensure compatibility with BERT v3.0

Generated code:`;

    let generatedCode;
    
    if (OPENAI_API_KEY) {
      // OpenAI API call
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert programmer specializing in R and Julia for data analysis in Excel environments.' },
          { role: 'user', content: enhancedPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      generatedCode = response.data.choices[0].message.content;
    } else {
      // Fallback to template-based generation
      const templates = CODE_TEMPLATES[language.toLowerCase()];
      if (templates) {
        generatedCode = templates.dataAnalysis; // Default template
      } else {
        generatedCode = `# Generated ${language} function
# TODO: Implement based on: ${prompt}
function_name <- function() {
  # Your code here
}`;
      }
    }

    logger.info('Code generated', { 
      language, 
      promptLength: prompt.length,
      codeLength: generatedCode.length 
    });

    res.json({
      code: generatedCode,
      language,
      confidence: OPENAI_API_KEY ? 0.9 : 0.6,
      suggestions: [
        'Test the function with sample data',
        'Add input validation',
        'Consider error handling for edge cases'
      ]
    });

  } catch (error) {
    logger.error('Code generation failed', { error: error.message });
    res.status(500).json({ error: 'Code generation failed' });
  }
});

// Code Completion
app.post('/ai/complete-code', async (req, res) => {
  try {
    const { code, cursor, language } = req.body;
    
    const suggestions = [
      {
        text: 'summary(data)',
        detail: 'Generate summary statistics',
        kind: 'function'
      },
      {
        text: 'plot(x, y)',
        detail: 'Create a basic plot',
        kind: 'function'
      },
      {
        text: 'library(ggplot2)',
        detail: 'Load ggplot2 package',
        kind: 'keyword'
      }
    ];

    res.json({ suggestions });
  } catch (error) {
    logger.error('Code completion failed', { error: error.message });
    res.status(500).json({ error: 'Code completion failed' });
  }
});

// Error Explanation
app.post('/ai/explain-error', async (req, res) => {
  try {
    const { error, code, language } = req.body;
    
    const explanation = {
      summary: 'Common error in data processing',
      details: 'This error typically occurs when trying to access data that doesn\'t exist or has incorrect format.',
      suggestions: [
        'Check if the data variable is properly defined',
        'Verify the data structure matches expected format',
        'Add error handling with try-catch blocks'
      ],
      fixedCode: code // In production, this would be AI-generated
    };

    logger.info('Error explained', { language, errorType: error });
    res.json(explanation);
  } catch (error) {
    logger.error('Error explanation failed', { error: error.message });
    res.status(500).json({ error: 'Error explanation failed' });
  }
});

// Function Documentation Generation
app.post('/ai/generate-docs', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    const documentation = {
      title: 'Generated Function Documentation',
      description: 'This function performs data analysis operations.',
      parameters: [
        { name: 'data', type: 'data.frame', description: 'Input data for analysis' }
      ],
      returns: 'Analysis results',
      examples: [
        `# Example usage:
result <- analyze_data(my_data)
print(result)`
      ]
    };

    logger.info('Documentation generated', { language, codeLength: code.length });
    res.json(documentation);
  } catch (error) {
    logger.error('Documentation generation failed', { error: error.message });
    res.status(500).json({ error: 'Documentation generation failed' });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ai-service',
    features: {
      openai: !!OPENAI_API_KEY,
      azure: !!AZURE_OPENAI_KEY
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`);
  logger.info('AI Service started', { port: PORT });
});

module.exports = app;