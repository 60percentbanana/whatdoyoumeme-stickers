let deck = [];
let idCounter = 0;

const deckGrid = document.getElementById('deckGrid');
const emptyState = document.getElementById('emptyState');
const promptList = document.getElementById('promptList');
const emptyPromptState = document.getElementById('emptyPromptState');
const printSheetStickers = document.getElementById('printSheetStickers');
const printSheetPrompts = document.getElementById('printSheetPrompts');
const gameTitleInput = document.getElementById('gameTitle');
const gameTitleDisplay = document.getElementById('gameTitleDisplay');
const cardCountStickers = document.getElementById('cardCountStickers');
const cardCountPrompts = document.getElementById('cardCountPrompts');

gameTitleInput.addEventListener('input', () => {
  gameTitleDisplay.textContent = (gameTitleInput.value || 'NOGRUP') + ' — card maker';
  renderStickerPrintSheet();
  renderPromptPrintSheet();
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'print') renderStickerPrintSheet();
    if (btn.dataset.tab === 'printPrompts') renderPromptPrintSheet();
  });
});

document.getElementById('photoInput').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      deck.push({
        id: 'card-' + (idCounter++),
        type: 'photo',
        image: ev.target.result,
        caption: '',
        fit: 'contain'
      });
      renderDeck();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

document.getElementById('addBulkPromptsBtn').addEventListener('click', () => {
  const input = document.getElementById('bulkPromptInput');
  const lines = input.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  lines.forEach(line => {
    deck.push({
      id: 'card-' + (idCounter++),
      type: 'caption',
      caption: line,
      textRotation: 0
    });
  });
  input.value = '';
  renderDeck();
});

document.getElementById('applyBulkRotateBtn').addEventListener('click', () => {
  const degrees = parseInt(document.getElementById('bulkRotateSelect').value, 10);
  deck.forEach(card => {
    if (card.type === 'caption'){
      card.textRotation = degrees;
    }
  });
  renderPromptDeck();
});

function rotateCardImage(dataUrl, degreesCW){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const swap = Math.abs(degreesCW % 180) === 90;
      const w = img.width, h = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = swap ? h : w;
      canvas.height = swap ? w : h;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(degreesCW * Math.PI / 180);
      ctx.drawImage(img, -w / 2, -h / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

document.getElementById('rotateAllBtn').addEventListener('click', async () => {
  const btn = document.getElementById('rotateAllBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Rotating...';
  btn.disabled = true;
  try {
    for (const card of deck){
      if (card.type === 'photo'){
        card.image = await rotateCardImage(card.image, -90);
      }
    }
    renderDeck();
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

document.getElementById('printBtnStickers').addEventListener('click', () => {
  window.print();
});
document.getElementById('printBtnPrompts').addEventListener('click', () => {
  window.print();
});

document.getElementById('downloadBtnStickers').addEventListener('click', () => {
  downloadPdf('photo', 'downloadBtnStickers', 'paperSize');
});
document.getElementById('downloadBtnPrompts').addEventListener('click', () => {
  downloadPdf('caption', 'downloadBtnPrompts', 'paperSizePrompts');
});

async function downloadPdf(cardType, btnId, paperSizeSelectId){
  const filtered = deck.filter(c => c.type === cardType);
  if (filtered.length === 0){
    alert('Add some ' + (cardType === 'photo' ? 'stickers' : 'prompts') + ' first.');
    return;
  }
  const btn = document.getElementById(btnId);
  const originalText = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    const paperKey = document.getElementById(paperSizeSelectId).value;
    const paper = PAPER_SIZES[paperKey];
    const margin = 0.25;
    const usableW = paper.w - margin * 2;
    const usableH = paper.h - margin * 2;

    const containerId = cardType === 'photo' ? 'printSheetStickers' : 'printSheetPrompts';
    const sheets = Array.from(document.querySelectorAll('#' + containerId + ' .sheet'));
    const { jsPDF } = window.jspdf;
    const zip = new JSZip();

    const title = (gameTitleInput.value || 'meme-cards').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'meme-cards';
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes());
    const suffix = cardType === 'photo' ? 'stickers' : 'prompts';

    for (let i = 0; i < sheets.length; i++){
      const canvas = await html2canvas(sheets[i], { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const singleDoc = new jsPDF({ unit: 'in', format: [paper.w, paper.h], orientation: 'portrait' });
      singleDoc.addImage(imgData, 'JPEG', margin, margin, usableW, usableH);
      const pdfBlob = singleDoc.output('blob');
      const pageNum = String(i + 1).padStart(2, '0');
      zip.file(title + '-' + suffix + '-pack' + pageNum + '.pdf', pdfBlob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title + '-' + suffix + '-' + stamp + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err){
    alert('Could not generate the PDFs. Make sure you have an internet connection (needed to load the PDF library), then try again.');
    console.error(err);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

document.getElementById('paperSize').addEventListener('change', renderStickerPrintSheet);
document.getElementById('cardsPerPage').addEventListener('change', renderStickerPrintSheet);
document.getElementById('paperSizePrompts').addEventListener('change', renderPromptPrintSheet);
document.getElementById('cardsPerPagePrompts').addEventListener('change', renderPromptPrintSheet);

function removeCard(id){
  deck = deck.filter(c => c.id !== id);
  renderDeck();
}

function updateCaption(id, value){
  const card = deck.find(c => c.id === id);
  if (card) card.caption = value;
}

function renderDeck(){
  renderPhotoDeck();
  renderPromptDeck();
}

function renderPhotoDeck(){
  const photos = deck.filter(c => c.type === 'photo');
  emptyState.style.display = photos.length === 0 ? 'block' : 'none';
  deckGrid.innerHTML = '';
  photos.forEach(card => {
    const item = document.createElement('div');
    item.className = 'deck-item';
    const tag = document.createElement('span');
    tag.className = 'type-tag';
    tag.textContent = 'Photo card';
    item.appendChild(tag);

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'thumb-wrap';
    const img = document.createElement('img');
    img.src = card.image;
    img.style.objectFit = card.fit === 'cover' ? 'cover' : 'contain';
    img.style.background = 'var(--paper)';
    thumbWrap.appendChild(img);
    item.appendChild(thumbWrap);

    const fitLabel = document.createElement('label');
    fitLabel.className = 'small';
    fitLabel.style.marginTop = '4px';
    fitLabel.textContent = 'Image fit';
    item.appendChild(fitLabel);

    const fitSelect = document.createElement('select');
    fitSelect.style.width = '100%';
    fitSelect.style.marginBottom = '8px';
    fitSelect.innerHTML = '<option value="contain">Fit whole sticker</option><option value="cover">Fill frame (may crop)</option>';
    fitSelect.value = card.fit === 'cover' ? 'cover' : 'contain';
    fitSelect.addEventListener('change', (e) => {
      card.fit = e.target.value;
      const img2 = thumbWrap.querySelector('img');
      if (img2) img2.style.objectFit = card.fit;
    });
    item.appendChild(fitSelect);

    const rotateRow = document.createElement('div');
    rotateRow.style.display = 'flex';
    rotateRow.style.gap = '6px';
    rotateRow.style.marginBottom = '8px';

    const rotateLeftBtn = document.createElement('button');
    rotateLeftBtn.type = 'button';
    rotateLeftBtn.textContent = '⟲ Left';
    rotateLeftBtn.style.flex = '1';
    rotateLeftBtn.style.fontSize = '11px';
    rotateLeftBtn.style.padding = '5px';
    rotateLeftBtn.addEventListener('click', async () => {
      rotateLeftBtn.disabled = true;
      card.image = await rotateCardImage(card.image, -90);
      renderPhotoDeck();
    });
    rotateRow.appendChild(rotateLeftBtn);

    const rotateRightBtn = document.createElement('button');
    rotateRightBtn.type = 'button';
    rotateRightBtn.textContent = '⟳ Right';
    rotateRightBtn.style.flex = '1';
    rotateRightBtn.style.fontSize = '11px';
    rotateRightBtn.style.padding = '5px';
    rotateRightBtn.addEventListener('click', async () => {
      rotateRightBtn.disabled = true;
      card.image = await rotateCardImage(card.image, 90);
      renderPhotoDeck();
    });
    rotateRow.appendChild(rotateRightBtn);

    item.appendChild(rotateRow);

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Optional caption (e.g. a punchline)';
    textarea.value = card.caption;
    textarea.addEventListener('input', (e) => {
      updateCaption(card.id, e.target.value);
    });
    item.appendChild(textarea);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove card';
    removeBtn.addEventListener('click', () => removeCard(card.id));
    item.appendChild(removeBtn);

    deckGrid.appendChild(item);
  });
}

function renderPromptDeck(){
  const prompts = deck.filter(c => c.type === 'caption');
  emptyPromptState.style.display = prompts.length === 0 ? 'block' : 'none';
  promptList.innerHTML = '';
  prompts.forEach((card, idx) => {
    const row = document.createElement('div');
    row.className = 'prompt-row';

    const num = document.createElement('span');
    num.style.fontSize = '12px';
    num.style.color = 'var(--muted)';
    num.style.minWidth = '20px';
    num.textContent = (idx + 1) + '.';
    row.appendChild(num);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Prompt text (e.g. "That moment when...")';
    input.value = card.caption;
    input.addEventListener('input', (e) => {
      updateCaption(card.id, e.target.value);
    });
    row.appendChild(input);

    const rotateBtn = document.createElement('button');
    rotateBtn.type = 'button';
    rotateBtn.className = 'remove-btn';
    rotateBtn.style.borderColor = 'var(--accent)';
    rotateBtn.style.color = 'var(--accent-ink)';
    rotateBtn.style.background = '#fff8ec';
    rotateBtn.textContent = '⟳ ' + (card.textRotation || 0) + '\u00b0';
    rotateBtn.title = 'Rotate this prompt\'s text 90\u00b0';
    rotateBtn.addEventListener('click', () => {
      card.textRotation = ((card.textRotation || 0) + 90) % 360;
      rotateBtn.textContent = '⟳ ' + card.textRotation + '\u00b0';
    });
    row.appendChild(rotateBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeCard(card.id));
    row.appendChild(removeBtn);

    promptList.appendChild(row);
  });
}

const LAYOUTS = {
  4:  {cols:2, rows:2},
  6:  {cols:2, rows:3},
  8:  {cols:2, rows:4},
  12: {cols:3, rows:4},
  16: {cols:4, rows:4},
  20: {cols:4, rows:5}
};

const PAPER_SIZES = {
  letter: {w:8.5, h:11},
  a4: {w:8.27, h:11.69}
};

function buildCardFace(card, title, cardWpx, cardHpx){
  const face = document.createElement('div');
  face.className = 'card-face ' + card.type;

  ['top', 'bottom', 'left', 'right'].forEach(side => {
    const bt = document.createElement('div');
    bt.className = 'border-text ' + side;
    bt.dataset.title = title;
    bt.textContent = title;
    if (side === 'left' || side === 'right'){
      const insetVert = cardHpx * 0.17;
      const insetHoriz = cardWpx * 0.016;
      const lengthPx = cardHpx - insetVert * 2;
      bt.style.width = lengthPx + 'px';
      if (side === 'left'){
        bt.style.left = insetHoriz + 'px';
        bt.style.top = (cardHpx - insetVert) + 'px';
        bt.style.transform = 'rotate(-90deg)';
      } else {
        bt.style.left = (cardWpx - insetHoriz) + 'px';
        bt.style.top = insetVert + 'px';
        bt.style.transform = 'rotate(90deg)';
      }
    }
    face.appendChild(bt);
  });

  if (card.type === 'photo'){
    const well = document.createElement('div');
    well.className = 'photo-well';
    const img = document.createElement('img');
    img.src = card.image;
    img.style.objectFit = card.fit === 'cover' ? 'cover' : 'contain';
    well.appendChild(img);
    face.appendChild(well);

    if (card.caption && card.caption.trim() !== ''){
      const strip = document.createElement('div');
      strip.className = 'cap-strip';
      strip.textContent = card.caption;
      face.appendChild(strip);
    }
  } else {
    const capText = document.createElement('div');
    capText.className = 'cap-text';
    capText.textContent = card.caption && card.caption.trim() !== '' ? card.caption : '...';
    capText.dataset.rotation = card.textRotation || 0;
    face.appendChild(capText);
  }

  return face;
}

function renderPrintSheetGeneric(cardType, containerEl, cardCountEl, paperSizeSelectId, cardsPerPageSelectId){
  const cards = deck.filter(c => c.type === cardType);
  cardCountEl.textContent = cards.length;
  containerEl.innerHTML = '';
  const title = gameTitleInput.value || 'NOGRUP';

  const paperKey = document.getElementById(paperSizeSelectId).value;
  const perPage = parseInt(document.getElementById(cardsPerPageSelectId).value, 10);
  const {cols, rows} = LAYOUTS[perPage];
  const paper = PAPER_SIZES[paperKey];

  const margin = 0.25;
  const gap = 0.08;
  const usableW = paper.w - margin * 2;
  const usableH = paper.h - margin * 2;
  const cellW = (usableW - gap * (cols - 1)) / cols;
  const cellH = (usableH - gap * (rows - 1)) / rows;

  const cardAspect = 5 / 7;

  function fitDims(w, h){
    if (w / h > cardAspect){
      return { w: h * cardAspect, h: h };
    }
    return { w: w, h: w / cardAspect };
  }

  const upright = fitDims(cellW, cellH);
  const rotated = fitDims(cellH, cellW);
  const useRotated = (rotated.w * rotated.h) > (upright.w * upright.h);
  const fit = useRotated ? rotated : upright;
  const cardW = fit.w;
  const cardH = fit.h;

  const cardFontSize = cardW * 13;
  const cardWidthPx = cardW * 96;
  const cardHeightPx = cardH * 96;

  if (cards.length === 0) return;

  const perSheet = cols * rows;
  const pageCount = Math.ceil(cards.length / perSheet);

  for (let p = 0; p < pageCount; p++){
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.style.width = usableW + 'in';
    sheet.style.height = usableH + 'in';
    sheet.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellW + 'in)';
    sheet.style.gridTemplateRows = 'repeat(' + rows + ', ' + cellH + 'in)';
    sheet.style.gap = gap + 'in';
    sheet.style.justifyItems = 'center';
    sheet.style.alignItems = 'center';

    const slice = cards.slice(p * perSheet, p * perSheet + perSheet);
    slice.forEach(card => {
      const face = buildCardFace(card, title, cardWidthPx, cardHeightPx);
      face.style.fontSize = cardFontSize + 'px';
      face.style.width = cardW + 'in';
      face.style.height = cardH + 'in';

      if (useRotated){
        const wrapper = document.createElement('div');
        wrapper.style.width = cardH + 'in';
        wrapper.style.height = cardW + 'in';
        wrapper.style.position = 'relative';
        face.style.position = 'absolute';
        face.style.top = '50%';
        face.style.left = '50%';
        face.style.transformOrigin = 'center center';
        face.style.transform = 'translate(-50%, -50%) rotate(90deg)';
        wrapper.appendChild(face);
        sheet.appendChild(wrapper);
      } else {
        sheet.appendChild(face);
      }
    });

    containerEl.appendChild(sheet);
  }

  fitAllBorderText(containerEl);
  applyCaptionRotations(containerEl);
  fitAllCaptionText(containerEl);
}

function renderStickerPrintSheet(){
  renderPrintSheetGeneric('photo', printSheetStickers, cardCountStickers, 'paperSize', 'cardsPerPage');
}

function renderPromptPrintSheet(){
  renderPrintSheetGeneric('caption', printSheetPrompts, cardCountPrompts, 'paperSizePrompts', 'cardsPerPagePrompts');
}

function fitBorderText(el, title){
  const available = el.clientWidth;
  const sep = '  \u2022  ';
  let best = 1;
  for (let n = 1; n <= 20; n++){
    el.textContent = Array(n).fill(title).join(sep);
    const size = el.scrollWidth;
    if (size <= available){
      best = n;
    } else {
      break;
    }
  }
  el.textContent = Array(best).fill(title).join(sep);
}

function fitAllBorderText(containerEl){
  containerEl.querySelectorAll('.border-text').forEach(el => {
    fitBorderText(el, el.dataset.title);
  });
}

function fitCaptionText(el){
  const rotation = parseInt(el.dataset.rotation || '0', 10);
  const available = (rotation === 90 || rotation === 270)
    ? parseFloat(el.dataset.altAvailable)
    : el.clientHeight;
  const widthAvailable = el.clientWidth;
  const maxSize = parseFloat(getComputedStyle(el).fontSize);
  const minSize = 9;
  let size = maxSize;
  let guard = 0;
  el.style.fontSize = size + 'px';
  while ((el.scrollHeight > available || el.scrollWidth > widthAvailable) && size > minSize && guard < 200){
    size = Math.max(minSize, size - Math.max(maxSize * 0.015, 0.5));
    el.style.fontSize = size + 'px';
    guard++;
  }
  guard = 0;
  const growStep = Math.max(maxSize * 0.008, 0.5);
  while (size < maxSize && guard < 300){
    const testSize = Math.min(maxSize, size + growStep);
    el.style.fontSize = testSize + 'px';
    if (el.scrollHeight <= available && el.scrollWidth <= widthAvailable){
      size = testSize;
    } else {
      el.style.fontSize = size + 'px';
      break;
    }
    guard++;
  }
}

function applyCaptionRotations(containerEl){
  containerEl.querySelectorAll('.cap-text').forEach(el => {
    const rotation = parseInt(el.dataset.rotation || '0', 10);
    if (rotation === 90 || rotation === 270){
      const naturalW = el.clientWidth;
      const naturalH = el.clientHeight;
      el.style.position = 'absolute';
      el.style.top = '50%';
      el.style.left = '50%';
      el.style.width = naturalH + 'px';
      el.style.height = naturalW + 'px';
      el.dataset.altAvailable = naturalW;
      el.style.transformOrigin = 'center center';
      el.style.transform = 'translate(-50%, -50%) rotate(' + rotation + 'deg)';
    } else if (rotation === 180){
      el.style.transform = 'rotate(180deg)';
    }
  });
}

function fitAllCaptionText(containerEl){
  containerEl.querySelectorAll('.cap-text').forEach(fitCaptionText);
}

renderDeck();
