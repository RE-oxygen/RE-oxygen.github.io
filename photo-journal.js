(() => {
  const journeys = Array.isArray(window.photoJourneys) ? window.photoJourneys : [];
  const canvas = document.getElementById('journey-globe');
  const list = document.getElementById('journey-list');
  const gallery = document.getElementById('journal-gallery');
  if (!canvas || !list || !gallery || !journeys.length) return;
  if (!journeys.some(journey => journey.sample)) canvas.setAttribute('aria-label', '可旋转的地球；拖动旋转，方向键移动，回车选择正面的地点');

  const context = canvas.getContext('2d');
  if (!context) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const degrees = Math.PI / 180;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad = value => String(value).padStart(2, '0');
  const formatCoordinate = (lat, lon) => `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;
  const fields = {
    count: document.getElementById('journey-count'),
    demoNote: document.getElementById('journal-demo-note'),
    coordinate: document.getElementById('journal-coordinate'),
    index: document.getElementById('story-index'),
    title: document.getElementById('story-title'),
    description: document.getElementById('story-description'),
    place: document.getElementById('story-place'),
    coordinates: document.getElementById('story-coordinates'),
    photoCount: document.getElementById('story-photo-count'),
    galleryCount: document.getElementById('gallery-count'),
    visual: document.getElementById('story-visual'),
    cover: document.getElementById('story-cover'),
    visualNumber: document.getElementById('story-visual-number')
  };

  // Natural Earth 1:110m land polygons keep the dot texture tied to real coastlines.
  const landShapes = (window.naturalEarthLand?.features || []).map(feature => ({
    bbox: feature.bbox,
    rings: feature.geometry.coordinates
  }));
  const inRing = (lon, lat, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const isLand = (lon, lat) => landShapes.some(({bbox, rings}) =>
    lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
    && inRing(lon, lat, rings[0]) && !rings.slice(1).some(ring => inRing(lon, lat, ring))
  );
  const landPoints = [];
  const pointStep = window.innerWidth < 700 ? 3 : 2.2;
  for (let lat = -88; lat <= 88; lat += pointStep) {
    for (let lon = -179; lon <= 179; lon += pointStep) {
      const jitterLat = lat + Math.sin(lon * 2.31 + lat) * .6;
      const jitterLon = lon + Math.cos(lat * 1.71 - lon) * .6;
      if (isLand(jitterLon, jitterLat)) landPoints.push([jitterLat, jitterLon]);
    }
  }
  const stars = Array.from({length:52}, (_, index) => ({
    x: (Math.sin(index * 91.73) * 43758.5453) % 1,
    y: (Math.sin(index * 51.19) * 22547.9821) % 1,
    r: index % 9 === 0 ? 1.2 : .6
  })).map(star => ({...star, x:Math.abs(star.x), y:Math.abs(star.y)}));

  let width = 0;
  let height = 0;
  let yaw = -.7;
  let pitch = .2;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let zoom = 1;
  let targetZoom = 1;
  let selectedIndex = 0;
  let hasInteracted = false;
  let isDragging = false;
  let dragMoved = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pressX = 0;
  let pressY = 0;
  let markerHits = [];
  let lastDraw = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  };

  const project = (lat, lon, radius, centerX, centerY) => {
    const latitude = lat * degrees;
    const longitude = lon * degrees;
    const x = Math.cos(latitude) * Math.sin(longitude);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.cos(longitude);
    const turnedX = x * Math.cos(yaw) + z * Math.sin(yaw);
    const turnedZ = z * Math.cos(yaw) - x * Math.sin(yaw);
    const turnedY = y * Math.cos(pitch) - turnedZ * Math.sin(pitch);
    const depth = y * Math.sin(pitch) + turnedZ * Math.cos(pitch);
    const perspective = 1 + depth * .075;
    return {x:centerX + turnedX * radius * perspective, y:centerY - turnedY * radius * perspective, depth};
  };

  const traceGrid = (radius, centerX, centerY, isLatitude, fixed) => {
    context.beginPath();
    let drawing = false;
    const start = isLatitude ? -180 : -85;
    const end = isLatitude ? 180 : 85;
    const step = 3;
    for (let value = start; value <= end; value += step) {
      const point = isLatitude ? project(fixed, value, radius, centerX, centerY) : project(value, fixed, radius, centerX, centerY);
      if (point.depth > .015) {
        if (drawing) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        drawing = true;
      } else drawing = false;
    }
    context.stroke();
  };

  function draw() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const centerX = width * .5;
    const centerY = height * .485;
    const radius = Math.min(width * .38, height * .42) * zoom;

    stars.forEach(star => {
      const x = star.x * width;
      const y = star.y * height;
      context.beginPath();
      context.fillStyle = 'rgba(178,221,218,.22)';
      context.arc(x, y, star.r, 0, Math.PI * 2);
      context.fill();
    });

    const atmosphere = context.createRadialGradient(centerX, centerY, radius * .82, centerX, centerY, radius * 1.27);
    atmosphere.addColorStop(0, 'rgba(80,170,179,0)');
    atmosphere.addColorStop(.52, 'rgba(80,170,179,.025)');
    atmosphere.addColorStop(1, 'rgba(80,170,179,0)');
    context.fillStyle = atmosphere;
    context.beginPath();
    context.arc(centerX, centerY, radius * 1.27, 0, Math.PI * 2);
    context.fill();

    const ocean = context.createRadialGradient(centerX - radius * .38, centerY - radius * .34, radius * .06, centerX, centerY, radius * 1.16);
    ocean.addColorStop(0, '#254c56');
    ocean.addColorStop(.58, '#12313b');
    ocean.addColorStop(1, '#06151d');
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = ocean;
    context.shadowColor = 'rgba(113,207,203,.28)';
    context.shadowBlur = 35;
    context.fill();
    context.shadowBlur = 0;
    context.save();
    context.clip();

    context.strokeStyle = 'rgba(177,231,224,.14)';
    context.lineWidth = .8;
    for (let lat = -60; lat <= 60; lat += 30) traceGrid(radius, centerX, centerY, true, lat);
    for (let lon = -180; lon < 180; lon += 30) traceGrid(radius, centerX, centerY, false, lon);

    context.strokeStyle = 'rgba(174,234,216,.25)';
    context.lineWidth = .75;
    landShapes.forEach(({rings}) => rings.forEach(ring => {
      context.beginPath();
      let drawing = false;
      ring.forEach(([lon, lat]) => {
        const point = project(lat, lon, radius, centerX, centerY);
        if (point.depth > .02) {
          if (drawing) context.lineTo(point.x, point.y);
          else context.moveTo(point.x, point.y);
          drawing = true;
        } else drawing = false;
      });
      context.stroke();
    }));

    landPoints.forEach(([lat, lon]) => {
      const point = project(lat, lon, radius, centerX, centerY);
      if (point.depth <= .02) return;
      const light = .32 + point.depth * .57;
      context.fillStyle = `rgba(180,236,215,${light.toFixed(3)})`;
      context.beginPath();
      context.arc(point.x, point.y, .9 + point.depth * .8, 0, Math.PI * 2);
      context.fill();
    });

    const shade = context.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    shade.addColorStop(0, 'rgba(4,16,23,.05)');
    shade.addColorStop(.65, 'rgba(4,16,23,0)');
    shade.addColorStop(1, 'rgba(2,10,15,.38)');
    context.fillStyle = shade;
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    context.restore();

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(158,226,219,.55)';
    context.lineWidth = 1.3;
    context.stroke();
    markerHits = [];
    journeys.forEach((journey, index) => {
      const point = project(journey.lat, journey.lon, radius, centerX, centerY);
      if (point.depth <= .08) return;
      const active = index === selectedIndex;
      context.beginPath();
      context.arc(point.x, point.y, active ? 16 : 12, 0, Math.PI * 2);
      context.fillStyle = active ? 'rgba(169,225,217,.15)' : 'rgba(213,239,231,.09)';
      context.fill();
      context.beginPath();
      context.arc(point.x, point.y, active ? 5.5 : 4, 0, Math.PI * 2);
      context.fillStyle = active ? '#e5fff4' : '#acd9d4';
      context.shadowColor = active ? '#b9fff1' : '#acd9d4';
      context.shadowBlur = active ? 17 : 8;
      context.fill();
      context.shadowBlur = 0;
      context.beginPath();
      context.arc(point.x, point.y, active ? 11 : 8, 0, Math.PI * 2);
      context.strokeStyle = active ? 'rgba(215,255,244,.8)' : 'rgba(172,217,212,.45)';
      context.lineWidth = 1;
      context.stroke();
      if (active) {
        context.strokeStyle = 'rgba(202,247,236,.68)';
        context.beginPath();
        context.moveTo(point.x + 13, point.y - 12);
        context.lineTo(point.x + 35, point.y - 34);
        context.lineTo(point.x + 77, point.y - 34);
        context.stroke();
        context.fillStyle = '#d6eee7';
        context.font = '700 10px Arial, sans-serif';
        context.fillText(`${pad(index + 1)} / ${journey.sample ? 'SAMPLE' : 'PLACE'}`, point.x + 39, point.y - 41);
      }
      markerHits.push({index, x:point.x, y:point.y});
    });
  }

  const listButtons = journeys.map((journey, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'journal-journey';
    button.setAttribute('aria-label', `选择${journey.title}，${journey.place}`);
    const number = document.createElement('span');
    number.className = 'journal-journey-number';
    number.textContent = pad(index + 1);
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.className = 'journal-journey-title';
    title.textContent = journey.title;
    const place = document.createElement('small');
    place.className = 'journal-journey-place';
    place.textContent = journey.place;
    copy.append(title, place);
    const arrow = document.createElement('span');
    arrow.className = 'journal-journey-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    button.append(number, copy, arrow);
    button.addEventListener('click', () => selectJourney(index));
    list.appendChild(button);
    return button;
  });
  if (!journeys.some(journey => journey.sample)) fields.demoNote.textContent = '选择地点，查看沿途记录的照片与故事。';

  const lightbox = document.getElementById('journal-lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  let lightboxIndex = 0;
  const showPhoto = index => {
    const photos = journeys[selectedIndex].photos || [];
    if (!photos.length) return;
    lightboxIndex = (index + photos.length) % photos.length;
    const photo = photos[lightboxIndex];
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt || photo.caption || journeys[selectedIndex].title;
    lightboxCaption.textContent = `${pad(lightboxIndex + 1)} / ${pad(photos.length)} · ${photo.caption || journeys[selectedIndex].place}`;
    if (!lightbox.open) lightbox.showModal();
  };
  lightbox.querySelector('.journal-lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('.journal-lightbox-prev').addEventListener('click', () => showPhoto(lightboxIndex - 1));
  lightbox.querySelector('.journal-lightbox-next').addEventListener('click', () => showPhoto(lightboxIndex + 1));
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showPhoto(lightboxIndex - 1);
    if (event.key === 'ArrowRight') showPhoto(lightboxIndex + 1);
  });

  const renderGallery = journey => {
    gallery.replaceChildren();
    const photos = journey.photos || [];
    fields.galleryCount.textContent = `${pad(photos.length)} PHOTOS`;
    if (!photos.length) {
      const empty = document.createElement('div');
      empty.className = 'journal-empty';
      empty.innerHTML = '<span aria-hidden="true">✳</span><p>这一段旅程的照片，正在等待被放进来。</p><small>PHOTOGRAPHS WILL APPEAR HERE</small>';
      gallery.appendChild(empty);
      return;
    }
    photos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'journal-photo';
      button.setAttribute('aria-label', `查看照片${index + 1}：${photo.caption || photo.alt || journey.title}`);
      const image = document.createElement('img');
      image.src = photo.src;
      image.alt = photo.alt || photo.caption || journey.title;
      image.loading = 'lazy';
      const caption = document.createElement('span');
      caption.textContent = photo.caption || `画面 ${pad(index + 1)}`;
      const icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '↗';
      caption.appendChild(icon);
      button.append(image, caption);
      button.addEventListener('click', () => showPhoto(index));
      gallery.appendChild(button);
    });
  };

  function selectJourney(index) {
    const journey = journeys[index];
    if (!journey) return;
    selectedIndex = index;
    hasInteracted = true;
    const destinationYaw = -journey.lon * degrees;
    const difference = Math.atan2(Math.sin(destinationYaw - yaw), Math.cos(destinationYaw - yaw));
    targetYaw = yaw + difference;
    targetPitch = clamp(journey.lat * degrees, -1.2, 1.2);
    fields.count.textContent = `${pad(index + 1)} / ${pad(journeys.length)}`;
    fields.coordinate.textContent = formatCoordinate(journey.lat, journey.lon);
    fields.index.textContent = `${pad(index + 1)} / ${journey.sample ? 'SAMPLE JOURNEY' : 'PHOTO JOURNEY'}`;
    fields.title.replaceChildren(document.createTextNode(journey.title));
    const period = document.createElement('span');
    period.textContent = '.';
    fields.title.appendChild(period);
    fields.description.textContent = journey.description;
    fields.place.textContent = journey.place;
    fields.coordinates.textContent = formatCoordinate(journey.lat, journey.lon);
    fields.photoCount.textContent = journey.photos?.length ? `${pad(journey.photos.length)} 张` : '待添加';
    fields.visualNumber.textContent = pad(index + 1);
    fields.visual.style.setProperty('--story-accent', journey.accent || '#a9e1d9');
    const coverPhoto = journey.photos?.[0];
    fields.visual.classList.toggle('has-photo', Boolean(coverPhoto));
    fields.cover.hidden = !coverPhoto;
    if (coverPhoto) fields.cover.src = coverPhoto.src;
    else fields.cover.removeAttribute('src');
    listButtons.forEach((button, buttonIndex) => {
      button.classList.toggle('is-active', buttonIndex === index);
      button.setAttribute('aria-pressed', String(buttonIndex === index));
    });
    renderGallery(journey);
    if (reducedMotion.matches) { yaw = targetYaw; pitch = targetPitch; draw(); }
  }

  const pointerPosition = event => {
    const bounds = canvas.getBoundingClientRect();
    return {x:event.clientX - bounds.left, y:event.clientY - bounds.top};
  };
  canvas.addEventListener('pointerdown', event => {
    const point = pointerPosition(event);
    canvas.setPointerCapture(event.pointerId);
    isDragging = true;
    dragMoved = false;
    hasInteracted = true;
    pressX = lastPointerX = point.x;
    pressY = lastPointerY = point.y;
  });
  canvas.addEventListener('pointermove', event => {
    if (!isDragging) return;
    const point = pointerPosition(event);
    const dx = point.x - lastPointerX;
    const dy = point.y - lastPointerY;
    if (Math.hypot(point.x - pressX, point.y - pressY) > 5) dragMoved = true;
    targetYaw += dx * .007;
    targetPitch = clamp(targetPitch + dy * .006, -1.3, 1.3);
    yaw = targetYaw;
    pitch = targetPitch;
    draw();
    lastPointerX = point.x;
    lastPointerY = point.y;
  });
  canvas.addEventListener('pointerup', event => {
    if (!isDragging) return;
    isDragging = false;
    if (dragMoved) return;
    const point = pointerPosition(event);
    const hit = markerHits.find(marker => Math.hypot(marker.x - point.x, marker.y - point.y) < 22);
    if (hit) selectJourney(hit.index);
  });
  canvas.addEventListener('pointercancel', () => { isDragging = false; });
  canvas.addEventListener('keydown', event => {
    let handled = true;
    hasInteracted = true;
    if (event.key === 'ArrowLeft') targetYaw -= .19;
    else if (event.key === 'ArrowRight') targetYaw += .19;
    else if (event.key === 'ArrowUp') targetPitch = clamp(targetPitch - .17, -1.3, 1.3);
    else if (event.key === 'ArrowDown') targetPitch = clamp(targetPitch + .17, -1.3, 1.3);
    else if (event.key === 'Enter') {
      const nearest = markerHits.reduce((best, marker) => {
        const distance = Math.hypot(marker.x - width / 2, marker.y - height / 2);
        return !best || distance < best.distance ? {index:marker.index, distance} : best;
      }, null);
      if (nearest) selectJourney(nearest.index);
    } else if (event.key === 'Home') selectJourney(selectedIndex);
    else handled = false;
    if (handled) event.preventDefault();
    if (reducedMotion.matches) { yaw = targetYaw; pitch = targetPitch; draw(); }
  });
  document.querySelectorAll('[data-globe-control]').forEach(button => {
    button.addEventListener('click', () => {
      hasInteracted = true;
      switch (button.dataset.globeControl) {
        case 'left': targetYaw -= .35; break;
        case 'right': targetYaw += .35; break;
        case 'zoom-out': targetZoom = clamp(targetZoom - .1, .8, 1.18); break;
        case 'zoom-in': targetZoom = clamp(targetZoom + .1, .8, 1.18); break;
        case 'reset': selectJourney(selectedIndex); targetZoom = 1; break;
      }
      if (reducedMotion.matches) { yaw = targetYaw; pitch = targetPitch; zoom = targetZoom; draw(); }
    });
  });

  function tick(time) {
    if (!document.hidden && time - lastDraw > 30) {
      if (!reducedMotion.matches) {
        if (!hasInteracted) targetYaw += .0012;
        yaw += (targetYaw - yaw) * .08;
        pitch += (targetPitch - pitch) * .08;
        zoom += (targetZoom - zoom) * .08;
        draw();
      }
      lastDraw = time;
    }
    requestAnimationFrame(tick);
  }

  selectJourney(0);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
})();
