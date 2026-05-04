const fs = require('fs');
const files = ['index.html', 'auth.html', 'dashboard.html', 'editor.html'];
files.forEach(f => {
    let content = fs.readFileSync('client/' + f, 'utf8');
    if(!content.includes('router.js')) {
        content = content.replace('</head>', '    <script src="/router.js"></script>\n</head>');
        fs.writeFileSync('client/' + f, content);
    }
});
console.log("Done");
