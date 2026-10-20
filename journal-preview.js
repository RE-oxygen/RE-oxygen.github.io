(() => {
  const canvas = document.getElementById('journal-preview-globe');
  const list = document.getElementById('journal-preview-list');
  if (!canvas || !list) return;

  const journeys = (window.photoJourneys || []).slice(0, 3);
  const features = window.naturalEarthLand?.features || [];
  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coordinate = document.getElementById('journal-preview-coordinate');
  const count = document.getElementById('journal-preview-count');
  const note = document.getElementById('journal-preview-note');
  const radians = Math.PI / 180;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const normalizeAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
  const formatCoordinate = (lat, lon) => `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;

  count.textContent = `${String(journeys.length).padStart(2, '0')} / ${String((window.photoJourneys || []).length).padStart(2, '0')}`;
  if (journeys.length && journeys.every(journey => !journey.sample)) {
    const photoCount = (window.photoJourneys || []).reduce((total, journey) => total + (journey.photos?.length || 0), 0);
    note.textContent = `已收录 ${(window.photoJourneys || []).length} 段旅程 · ${photoCount} 张照片`;
  }

  const buttons = journeys.map((journey, index) => {
    const button = document.createElement('button');
    button.className = 'journal-preview-item';
    button.type = 'button';
    const photo = journey.photos?.[0];
    if (photo?.src) {
      const image = document.createElement('img');
      image.className = 'journal-preview-item-thumb';
      image.src = photo.thumb || photo.src;
      image.alt = '';
      image.loading = 'lazy';
      button.append(image);
    } else {
      const number = document.createElement('span');
      number.className = 'journal-preview-item-number';
      number.textContent = String(index + 1).padStart(2, '0');
      button.append(number);
    }
    const copy = document.createElement('span');
    copy.className = 'journal-preview-item-copy';
    const title = document.createElement('strong');
    title.textContent = journey.title;
    const place = document.createElement('small');
    place.textContent = journey.place;
    copy.append(title, place);
    const arrow = document.createElement('span');
    arrow.className = 'journal-preview-item-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    button.append(copy, arrow);
    button.addEventListener('click', () => select(index));
    list.append(button);
    return button;
  });

  const landShapes = features.map(feature => ({ bbox: feature.bbox, rings: feature.geometry.coordinates }));
  const inRing = (lon, lat, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const isLand = (lon, lat) => landShapes.some(({ bbox, rings }) =>
    lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
    && inRing(lon, lat, rings[0]) && !rings.slice(1).some(ring => inRing(lon, lat, ring))
  );
  const landPoints = [];
  for (let lat = -84; lat <= 84; lat += 3.8) {
    for (let lon = -178; lon <= 178; lon += 3.8) {
      if (isLand(lon, lat)) landPoints.push([lat, lon]);
    }
  }

  let width = 0;
  let height = 0;
  let yaw = journeys.length ? -journeys[0].lon * radians : -.7;
  let pitch = journeys.length ? clamp(journeys[0].lat * radians, -.65, .65) : .2;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let selectedIndex = 0;
  let markerHits = [];
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let pressX = 0;
  let pressY = 0;
  let visible = true;
  let lastFrame = 0;
  let lastInteraction = performance.now();

  function project(lat, lon, radius, centerX, centerY) {
    const latitude = lat * radians;
    const longitude = lon * radians;
    const x = Math.cos(latitude) * Math.sin(longitude);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.cos(longitude);
    const turnedX = x * Math.cos(yaw) + z * Math.sin(yaw);
    const turnedZ = z * Math.cos(yaw) - x * Math.sin(yaw);
    const turnedY = y * Math.cos(pitch) - turnedZ * Math.sin(pitch);
    const depth = y * Math.sin(pitch) + turnedZ * Math.cos(pitch);
    return { x: centerX + turnedX * radius, y: centerY - turnedY * radius, depth };
  }

  function drawGrid(radius, centerX, centerY, latitudeLine, fixed) {
    context.beginPath();
    let drawing = false;
    for (let value = latitudeLine ? -180 : -85; value <= (latitudeLine ? 180 : 85); value += 4) {
      const point = latitudeLine ? project(fixed, value, radius, centerX, centerY) : project(value, fixed, radius, centerX, centerY);
      if (point.depth > .015) {
        if (drawing) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        drawing = true;
      } else drawing = false;
    }
    context.stroke();
  }

  function draw() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const centerX = width * .5;
    const centerY = height * .49;
    const radius = Math.min(width * .39, height * .42);
    const glow = context.createRadialGradient(centerX, centerY, radius * .5, centerX, centerY, radius * 1.3);
    glow.addColorStop(0, 'rgba(122,210,197,.12)');
    glow.addColorStop(1, 'rgba(122,210,197,0)');
    context.fillStyle = glow;
    context.fillRect(centerX - radius * 1.3, centerY - radius * 1.3, radius * 2.6, radius * 2.6);

    const ocean = context.createRadialGradient(centerX - radius * .4, centerY - radius * .42, radius * .08, centerX, centerY, radius * 1.18);
    ocean.addColorStop(0, '#2b5860');
    ocean.addColorStop(.6, '#153640');
    ocean.addColorStop(1, '#071923');
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = ocean;
    context.shadowColor = 'rgba(125,217,210,.28)';
    context.shadowBlur = 32;
    context.fill();
    context.shadowBlur = 0;
    context.save();
    context.clip();

    context.strokeStyle = 'rgba(176,229,223,.12)';
    context.lineWidth = .8;
    for (let lat = -60; lat <= 60; lat += 30) drawGrid(radius, centerX, centerY, true, lat);
    for (let lon = -180; lon < 180; lon += 30) drawGrid(radius, centerX, centerY, false, lon);

    context.strokeStyle = 'rgba(166,226,214,.28)';
    context.lineWidth = .7;
    landShapes.forEach(({ rings }) => rings.forEach(ring => {
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
      if (point.depth <= .025) return;
      context.beginPath();
      context.arc(point.x, point.y, .65 + point.depth * .58, 0, Math.PI * 2);
      context.fillStyle = `rgba(182,236,220,${(.32 + point.depth * .55).toFixed(2)})`;
      context.fill();
    });
    context.restore();

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(164,227,219,.42)';
    context.lineWidth = 1;
    context.stroke();
    markerHits = [];
    journeys.forEach((journey, index) => {
      const point = project(journey.lat, journey.lon, radius, centerX, centerY);
      if (point.depth <= .08) return;
      const active = index === selectedIndex;
      context.beginPath();
      context.arc(point.x, point.y, active ? 13 : 10, 0, Math.PI * 2);
      context.fillStyle = active ? 'rgba(169,225,217,.18)' : 'rgba(213,239,231,.1)';
      context.fill();
      context.beginPath();
      context.arc(point.x, point.y, active ? 4.5 : 3.5, 0, Math.PI * 2);
      context.fillStyle = active ? '#edfff8' : '#abd8d0';
      context.shadowColor = '#abf1df';
      context.shadowBlur = active ? 18 : 8;
      context.fill();
      context.shadowBlur = 0;
      markerHits.push({ index, x: point.x, y: point.y });
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function select(index) {
    const journey = journeys[index];
    if (!journey) return;
    selectedIndex = index;
    buttons.forEach((button, buttonIndex) => {
      button.classList.toggle('is-active', buttonIndex === index);
      button.setAttribute('aria-pressed', String(buttonIndex === index));
    });
    targetYaw = yaw + normalizeAngle(-journey.lon * radians - yaw);
    targetPitch = clamp(journey.lat * radians, -.65, .65);
    coordinate.textContent = formatCoordinate(journey.lat, journey.lon);
    lastInteraction = performance.now();
    if (reducedMotion.matches) { yaw = targetYaw; pitch = targetPitch; draw(); }
  }

  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    dragging = true;
    moved = false;
    pressX = lastX = event.clientX;
    pressY = lastY = event.clientY;
    lastInteraction = performance.now();
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 5) moved = true;
    targetYaw += dx * .007;
    targetPitch = clamp(targetPitch + dy * .006, -1.2, 1.2);
    yaw = targetYaw;
    pitch = targetPitch;
    lastX = event.clientX;
    lastY = event.clientY;
    lastInteraction = performance.now();
    draw();
  });
  canvas.addEventListener('pointerup', event => {
    dragging = false;
    if (moved) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = markerHits.find(marker => Math.hypot(marker.x - x, marker.y - y) < 22);
    if (hit) select(hit.index);
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('keydown', event => {
    let handled = true;
    if (event.key === 'ArrowLeft') targetYaw -= .2;
    else if (event.key === 'ArrowRight') targetYaw += .2;
    else if (event.key === 'ArrowUp') targetPitch = clamp(targetPitch - .16, -1.2, 1.2);
    else if (event.key === 'ArrowDown') targetPitch = clamp(targetPitch + .16, -1.2, 1.2);
    else handled = false;
    if (handled) {
      event.preventDefault();
      lastInteraction = performance.now();
      if (reducedMotion.matches) { yaw = targetYaw; pitch = targetPitch; draw(); }
    }
  });

  function tick(time) {
    if (visible && !document.hidden && time - lastFrame > 32 && !reducedMotion.matches) {
      if (!dragging && time - lastInteraction > 6000) targetYaw += .00065;
      yaw += (targetYaw - yaw) * .075;
      pitch += (targetPitch - pitch) * .075;
      draw();
      lastFrame = time;
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; }).observe(canvas);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  select(0);
  resize();
  requestAnimationFrame(tick);
})();
