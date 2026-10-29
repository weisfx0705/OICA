from pathlib import Path
from PIL import Image,ImageOps
import json,requests,io
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'assets/photos'; REF=Path.home()/'Desktop/國際處/kaohsiung_interactive_presentation/assets'; CAMPUS=Path.home()/'Desktop/國際處/11 photos'
jobs={
 'night-market':REF/'liuhe-night-market.jpg', 'breakfast-danbing':REF/'breakfast-danbing.jpg', 'breakfast-soymilk':REF/'breakfast-soymilk.jpg', 'bubble-tea':REF/'bubble-tea.jpg',
 'cijin-pier':REF/'cijin-ferry.jpg', 'pier2':REF/'pier2.jpg', 'light-rail':REF/'light-rail-pier2.jpg', 'music-center':REF/'kaohsiung-music-center.jpg', 'weiwuying':REF/'weiwuying-aerial.jpg',
 'mountain-valley':REF/'maolin-valley.jpg', 'dome-of-light':REF/'dome-of-light.jpg', 'harbor-night':REF/'wl-bay-night.jpg', 'hsr-train':REF/'hsr-zuoying.jpg', 'kaohsiung-station':REF/'kaohsiung-station.jpg', 'lotus-pond':REF/'lotus-pond.jpg',
 'campus-admin':CAMPUS/'1709_未命名_145-2.jpg', 'campus-gate':CAMPUS/'1709_未命名_280-編輯.jpg', 'campus-building':CAMPUS/'1709_未命名_331.jpg',
 'campus-stairs':CAMPUS/'7_彥彰_0.jpg', 'campus-students':CAMPUS/'I-Shou Uni Promotion Photoshoot (148)_0.JPG', 'campus-international':CAMPUS/'I-Shou Uni Promotion Photoshoot (126)_0.JPG',
 'campus-hands-on':CAMPUS/'I-Shou Uni Promotion Photoshoot (68)_0.JPG', 'campus-neighborhood':CAMPUS/'LINE_ALBUM_2022.05.31校景_220725_48_0.jpg', 'campus-courtyard':CAMPUS/'義守大學校景圖_0.jpg',
}
remote={
 'chaishan':'https://khh.travel/Image/439/?r=1674115586839',
 'chaishan-trail':'https://khh.travel/Image/43063/?r=1674110076587',
 'sizihwan':'https://khh.travel/Image/37412/?r=1642667524016',
 'metaverse-center':'https://www.isu.edu.tw/storage/images/0gqnIk0lirMng1ZJdbaBhrCAt2r2ocNUv1qcxUm1.jpg',
 'campus-map':'https://www.isu.edu.tw/storage/images/xIPmd523oeeSgQvfmtSV7synflcKOwP0ShU1ncmH.webp',
 'medical-map':'https://www.isu.edu.tw/storage/images/j77rqdqFe2NSKJRQv8sb5apG3Y9m1tXvo90yxK17.webp',
}
manifest=[]
for name,src in {**jobs,**remote}.items():
 if isinstance(src,Path): raw=src.read_bytes(); source=str(src)
 else:
  response=requests.get(src,timeout=40);response.raise_for_status();raw=response.content;source=src
 im=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
 limit=1800 if name.endswith('map') else 1280
 im.thumbnail((limit,limit));dst=DEST/f'{name}.webp';im.save(dst,'WEBP',quality=84 if name.endswith('map') else 80,method=6)
 manifest.append({'file':f'assets/photos/{name}.webp','source':source,'width':im.width,'height':im.height,'bytes':dst.stat().st_size,'originalBytes':len(raw)})
for src in list(DEST.glob('*.jpg')):
 # Existing in-game images get equivalent WebP assets, preserving their composition.
 im=ImageOps.exif_transpose(Image.open(src)).convert('RGB');im.thumbnail((1280,1280));dst=src.with_suffix('.webp')
 if not dst.exists(): im.save(dst,'WEBP',quality=80,method=6)
manifest_path=ROOT/'assets/photo-manifest.json';manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print({'selectedPhotos':len(manifest),'new_webp_mb':round(sum(i['bytes'] for i in manifest)/1e6,2),'selected_source_mb':round(sum(i['originalBytes'] for i in manifest)/1e6,2)})
