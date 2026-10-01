from pathlib import Path
import base64
import html

root = Path(__file__).resolve().parent.parent
document = (root / '.build' / 'orientation.template.html').read_text()
assets = {
    '__LOGO__': ('isu-logo.webp', 'image/webp'),
    '__CONVERSATION__': ('cross-cultural-conversation-user.jpg', 'image/jpeg'),
    '__TREE_QR__': ('tree-hollow-qr.png', 'image/png'),
    '__LINE_QR__': ('line-community-qr.png', 'image/png'),
    '__TWIN_WAVE__': ('twin-wave.png', 'image/png'),
    '__TWIN_THINKING__': ('twin-thinking.png', 'image/png'),
    '__TWIN_CONFUSED__': ('twin-confused.jpg', 'image/jpeg'),
    '__TWIN_CODING__': ('twin-coding.png', 'image/png'),
    '__TWIN_BRAVE__': ('twin-brave.png', 'image/png'),
}
for marker, (name, mime) in assets.items():
    encoded = base64.b64encode((root / 'assets' / name).read_bytes()).decode()
    document = document.replace(marker, f'data:{mime};base64,{encoded}')
line_url = 'https://line.me/ti/g2/OkLw7071VhAAEJP4AsO57MDP2BSlICvvnxL17w?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'
document = document.replace('__LINE_URL__', html.escape(line_url, quote=True))
output = root / 'isu-orientation-2026.html'
output.write_text(document)
print('Saved:', output)
