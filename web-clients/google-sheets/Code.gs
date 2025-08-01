/**
 * BERT v3.0 Google Sheets Add-on
 * Connects Google Sheets to BERT API Gateway for R/Julia function execution
 */

const BERT_API_BASE = 'https://bert-api.azurewebsites.net/api/v1';
const ADDON_TITLE = 'BERT v3.0';

/**
 * Creates custom menu when add-on is installed
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Creates custom menu when spreadsheet is opened
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('Open BERT Console', 'showSidebar')
    .addItem('Execute Function', 'executeFunction')
    .addSeparator()
    .addItem('List Functions', 'listFunctions')
    .addItem('Settings', 'showSettings')
    .addToUi();
}

/**
 * Shows the BERT console sidebar
 */
function showSidebar() {
  const html = HtmlService.createTemplateFromFile('sidebar')
    .evaluate()
    .setTitle(ADDON_TITLE)
    .setWidth(400);
  
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Executes a BERT function with parameters from selected cells
 */
function executeFunction() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  
  // Get function name from user
  const result = ui.prompt(
    'Execute BERT Function',
    'Enter function name (e.g., TestAdd):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result.getSelectedButton() === ui.Button.OK) {
    const functionName = result.getResponseText();
    const values = range.getValues().flat().filter(v => v !== '');
    
    try {
      const response = callBertApi('functions/execute', {
        function_name: functionName,
        language: 'R', // Default to R
        parameters: values,
        workspace_id: 'default'
      });
      
      if (response.status === 'success') {
        // Write result to the cell below the selection
        const resultRange = sheet.getRange(range.getLastRow() + 1, range.getColumn());
        resultRange.setValue(response.result);
        
        ui.alert('Success', `Function executed successfully. Result: ${response.result}`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Function execution failed: ${response.error || 'Unknown error'}`, ui.ButtonSet.OK);
      }
    } catch (error) {
      ui.alert('Error', `Failed to execute function: ${error.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Lists available BERT functions
 */
function listFunctions() {
  try {
    const response = callBertApi('functions', null, 'GET');
    const functions = response.functions || [];
    
    let message = 'Available BERT Functions:\n\n';
    functions.forEach(func => {
      message += `• ${func.name} (${func.language})\n  ${func.description || 'No description'}\n\n`;
    });
    
    SpreadsheetApp.getUi().alert('BERT Functions', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', `Failed to list functions: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Shows settings dialog
 */
function showSettings() {
  const html = HtmlService.createTemplateFromFile('settings')
    .evaluate()
    .setWidth(500)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'BERT Settings');
}

/**
 * Makes API call to BERT Gateway
 */
function callBertApi(endpoint, payload = null, method = 'POST') {
  const url = `${BERT_API_BASE}/${endpoint}`;
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'BERT-GoogleSheets-Addon/3.0.0'
    },
    muteHttpExceptions: true
  };
  
  if (payload && method === 'POST') {
    options.payload = JSON.stringify(payload);
  }
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  
  if (responseCode !== 200) {
    throw new Error(`API request failed with status ${responseCode}: ${response.getContentText()}`);
  }
  
  return JSON.parse(response.getContentText());
}

/**
 * Custom function for executing BERT functions directly in cells
 * Usage: =BERT_EXECUTE("TestAdd", A1:A5, "R")
 */
function BERT_EXECUTE(functionName, parameters, language = 'R') {
  if (!functionName) {
    return '#ERROR: Function name required';
  }
  
  try {
    // Convert parameters to array
    let paramArray = [];
    if (Array.isArray(parameters)) {
      paramArray = parameters.flat().filter(v => v !== '');
    } else if (parameters !== undefined && parameters !== '') {
      paramArray = [parameters];
    }
    
    const response = callBertApi('functions/execute', {
      function_name: functionName,
      language: language.toUpperCase(),
      parameters: paramArray,
      workspace_id: 'default'
    });
    
    if (response.status === 'success') {
      return response.result;
    } else {
      return `#ERROR: ${response.error || 'Function execution failed'}`;
    }
  } catch (error) {
    return `#ERROR: ${error.message}`;
  }
}

/**
 * Include HTML files in the script
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}