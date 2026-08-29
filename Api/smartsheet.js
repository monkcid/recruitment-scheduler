export default async function handler(req, res) {
  const token = process.env.SMARTSHEET_TOKEN;
  const sheetId = process.env.SMARTSHEET_SHEET_ID;

  if (!token || !sheetId) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, data } = req.body || {};

  try {
    switch (action) {
      case 'getSheet':
        return await getSheet(token, sheetId, res);
      case 'addRow':
        return await addRow(token, sheetId, data, res);
      case 'updateRow':
        return await updateRow(token, sheetId, data, res);
      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function smartsheetError(response) {
  let detail = '';
  try {
    const body = await response.json();
    detail = body.message || JSON.stringify(body);
  } catch {
    detail = await response.text().catch(() => '');
  }
  return new Error(`Smartsheet error ${response.status}: ${detail}`);
}

async function getSheet(token, sheetId, res) {
  const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw await smartsheetError(response);

  const data = await response.json();
  return res.status(200).json(data);
}

async function addRow(token, sheetId, rowData, res) {
  const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}/rows`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toBottom: true,
      cells: rowData.cells,
    }),
  });

  if (!response.ok) throw await smartsheetError(response);

  const data = await response.json();
  return res.status(200).json(data);
}

async function updateRow(token, sheetId, rowData, res) {
  const response = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}/rows`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      id: rowData.id,
      cells: rowData.cells,
    }]),
  });

  if (!response.ok) throw await smartsheetError(response);

  const data = await response.json();
  return res.status(200).json(data);
}
