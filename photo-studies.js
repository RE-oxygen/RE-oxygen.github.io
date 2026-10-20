(() => {
  const studies = Array.isArray(window.photoStudies) ? window.photoStudies : [];
  const collectionRoot = document.getElementById('studies-collections');
  const lightbox = document.getElementById('studies-lightbox');
  if (!collectionRoot || !lightbox) return;

  const lightboxImage = document.getElementById('studies-lightbox-image');
  const lightboxCaption = document.getElementById('studies-lightbox-caption');
  const photos = [];
  const pad = number => String(number).padStart(2, '0');
  let activePhoto = 0;

  const showPhoto = index => {
    if (!photos.length) return;
    activePhoto = (index + photos.length) % photos.length;
    const photo = photos[activePhoto];
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt || '产品摄影';
    lightboxCaption.textContent = `${pad(activePhoto + 1)} / ${pad(photos.length)}`;
    if (!lightbox.open) lightbox.showModal();
  };

  lightbox.querySelector('.journal-lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('.journal-lightbox-prev').addEventListener('click', () => showPhoto(activePhoto - 1));
  lightbox.querySelector('.journal-lightbox-next').addEventListener('click', () => showPhoto(activePhoto + 1));
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showPhoto(activePhoto - 1);
    if (event.key === 'ArrowRight') showPhoto(activePhoto + 1);
  });

  studies.forEach((study, studyIndex) => {
    const studyPhotos = Array.isArray(study.photos) ? study.photos.filter(photo => photo.src) : [];
    if (!studyPhotos.length) return;

    const section = document.createElement('section');
    section.className = 'studies-collection';
    section.id = study.id || `study-${pad(studyIndex + 1)}`;
    const headingId = `study-title-${pad(studyIndex + 1)}`;
    section.setAttribute('aria-labelledby', headingId);

    const line = document.createElement('div');
    line.className = 'journal-section-line';
    const overline = document.createElement('span');
    overline.textContent = `${pad(studyIndex + 1)} / PRODUCT PHOTOGRAPHY`;
    const seriesCount = document.createElement('span');
    seriesCount.textContent = `${pad(studyPhotos.length)} — IMAGES`;
    line.append(overline, seriesCount);

    const heading = document.createElement('h2');
    heading.id = headingId;
    heading.textContent = study.title || `产品摄影 ${pad(studyIndex + 1)}`;

    const gallery = document.createElement('div');
    gallery.className = 'studies-gallery';
    studyPhotos.forEach((photo, photoIndex) => {
      const globalIndex = photos.push(photo) - 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'studies-photo';
      button.setAttribute('aria-label', `查看${study.title || '产品摄影'}第${photoIndex + 1}张`);
      const image = document.createElement('img');
      image.src = photo.thumb || photo.src;
      image.alt = photo.alt || study.title || '产品摄影';
      if (photo.width && photo.height) {
        image.width = photo.width;
        image.height = photo.height;
      }
      image.loading = photoIndex < 3 && studyIndex === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      button.appendChild(image);
      button.addEventListener('click', () => showPhoto(globalIndex));
      gallery.appendChild(button);
    });

    section.append(line, heading, gallery);
    collectionRoot.appendChild(section);
  });
})();
