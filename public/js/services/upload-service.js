/* ============================================================
   services/upload-service.js — File upload handling
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const { API, Files, CONFIG, Toast } = EH;

  const Upload = {
    async single(endpoint, file, extra = {}, fieldName = 'file') {
      if (!file) throw new EH.ValidationError('No file selected');
      if (!Files.withinLimit(file, CONFIG.MAX_UPLOAD_MB)) {
        throw new EH.ValidationError(`File exceeds ${CONFIG.MAX_UPLOAD_MB}MB limit`);
      }
      const fd = new FormData();
      fd.append(fieldName, file);
      Object.keys(extra).forEach(k => fd.append(k, extra[k]));
      return API.upload(endpoint, fd);
    },

    async multiple(endpoint, files, fieldName = 'files') {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append(fieldName, f));
      return API.upload(endpoint, fd);
    },

    async withProgress(endpoint, formData, onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', (CONFIG.API_BASE || '') + endpoint);
        const token = EH.Store?.getToken?.();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch (_) { resolve(xhr.responseText); }
          } else {
            reject(new EH.AppError(`Upload failed: HTTP ${xhr.status}`, EH.ERROR_CODES.SERVER, xhr.status));
          }
        };
        xhr.onerror = () => reject(new EH.NetworkError('Upload failed'));
        xhr.send(formData);
      });
    },

    async avatar(file) {
      return this.single('/api/user/avatar', file, {}, 'avatar');
    },

    async courseMaterial(courseId, file, title) {
      return this.single('/api/expert/courses/' + courseId + '/materials', file, { title });
    },

    async chatAttachment(consultationId, file) {
      const fd = new FormData();
      fd.append('attachments', file);
      return API.upload(`/api/common/consultations/${consultationId}/attachments`, fd);
    },
  };

  EH.Upload = Upload;
})(window);
