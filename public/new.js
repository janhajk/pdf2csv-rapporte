document.getElementById('analyzeButton').addEventListener('click', async() => {
      const files = document.getElementById('pdfUpload').files;
      const formData = new FormData();

      for (let i = 0; i < files.length; i++) {
            formData.append(`file${i}`, files[i]);
      }

      const response = await fetch('https://1o0kgfv6j0.execute-api.eu-west-1.amazonaws.com/prod/pdf', {
            method: 'POST',
            body: formData
      });

      if (!response.ok) {
            alert('Fehler beim Hochladen der PDFs.');
            return;
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const downloadLink = document.getElementById('downloadLink');
      downloadLink.href = url;
      downloadLink.style.display = 'block';
});
