const xlsx = require('xlsx');

// Datos de prueba diferentes a los predefinidos
const datosReales = [
    ['Ventas'],
    [200],
    [210],
    [195],
    [220],
    [235],
    [240],
    [225],
    [250],
    [260],
    [245],
    [270],
    [285],
    [280],
    [295],
    [310],
    [305],
    [320],
    [335],
    [330],
    [345]
];

// Crear workbook
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(datosReales);

// Agregar worksheet al workbook
xlsx.utils.book_append_sheet(wb, ws, 'Datos');

// Escribir archivo
xlsx.writeFile(wb, 'datos-prueba-reales.xlsx');

console.log('✅ Archivo Excel creado: datos-prueba-reales.xlsx');
console.log('📊 Datos:', datosReales.slice(1).map(row => row[0]).join(', '));