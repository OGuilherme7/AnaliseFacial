const video = document.querySelector('#webcam');
const canvasOlho = document.createElement('canvas');
const canvasPele = document.createElement('canvas');
const spanFaceNotDetected = document.querySelector('.face-not-detected');
const spanIdadeEstimada = document.querySelector('#idade-estimada');
const spanGeneroDetectado = document.querySelector('#genero-detectado');
const spanAcessorios = document.querySelector('#acessorios');
const spanEmocao = document.querySelector('#emocao');
const spanCorOlho = document.querySelector('#cor-olho');
const spanCorPele = document.querySelector('#cor-pele');
const contextSkin = canvasPele.getContext('2d');
let frameCount = 0;

async function startVideo () {
  navigator.mediaDevices.getUserMedia({
    video: true
  })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => console.error('Acesso a camêra negado.\n\n', err));
}


async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
  await faceapi.nets.ageGenderNet.loadFromUri('/models');
  await faceapi.nets.faceExpressionNet.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
}

async function onPlay() {

  if (frameCount == 50) {
    frameCount = 0;
    const detections = await faceapi.detectAllFaces(video)
      .withFaceLandmarks()
      .withAgeAndGender()
      .withFaceExpressions()
  
    if (detections.length == 0) {
      spanFaceNotDetected.style.display = 'block';
      spanFaceNotDetected.innerText = 'Rosto não idenfificado';
    } else {
      spanFaceNotDetected.style.display = 'none';
      
      const expressoesProbabilidades = detections[0].expressions;
      let expressaoPredominante = Object.keys(expressoesProbabilidades).reduce((a, b) => 
        expressoesProbabilidades[a] > expressoesProbabilidades[b] ? a : b
      )

      switch (expressaoPredominante) {
        case 'sad':
          expressaoPredominante = 'Triste'
          break;
        case 'happy':
          expressaoPredominante = 'Feliz'
          break;
        case 'disgusted':
          expressaoPredominante = 'Enojado'
          break;
        case 'neutral':
          expressaoPredominante = 'Neutro'
          break;
        case 'fearful':
          expressaoPredominante = 'Medo'
          break;
        case 'surprised':
          expressaoPredominante = 'Surpreso'
          break;
        case 'angry': 
          expressaoPredominante = 'Nervoso'
      }

      const pessoa = {
        idadeEstimada: detections[0].age.toFixed(0),
        genero: detections[0].gender=='male'?'Homem':'Mulher',
        expressaoPredominante
      }

      spanIdadeEstimada.innerText = pessoa.idadeEstimada
      spanEmocao.innerText = pessoa.expressaoPredominante;
      spanGeneroDetectado.innerText = pessoa.genero;

      const colorEyeRgb = getColorEye(detections);
      spanCorOlho.parentNode.style.backgroundColor = colorEyeRgb;

      console.log('Aqui, dentro do onplay: ', detections)
      const colorSkinRgb = getSkinColor(detections[0]);
      spanCorPele.parentNode.style.backgroundColor = colorSkinRgb;
    } 
  }

  frameCount++;
  requestAnimationFrame(onPlay);
}


function getColorEye (detections) {
  const eyeWidth = 50; 
  const eyeHeight = 30;

  detections.forEach(detection => {
    const landmarks = detection.landmarks;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const leftEyePosition = {
      x: (leftEye[0].x + leftEye[3].x) / 2,
      y: (leftEye[1].y + leftEye[4].y) / 2
    };
    const rightEyePosition = {
      x: (rightEye[0].x + rightEye[3].x) / 2,
      y: (rightEye[1].y + rightEye[4].y) / 2
    };

    const context = canvasOlho.getContext('2d');
    context.drawImage(video, leftEyePosition.x - eyeWidth / 2, leftEyePosition.y - eyeHeight / 2, eyeWidth, eyeHeight, 0, 0, eyeWidth, eyeHeight);
    
    const imageData = context.getImageData(0, 0, eyeWidth, eyeHeight);
    const data = imageData.data;

    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];     
      g += data[i + 1]; 
      b += data[i + 2];
    }
    
    const pixelCount = data.length / 4;
    r = Math.round(r / pixelCount);
    g = Math.round(g / pixelCount);
    b = Math.round(b / pixelCount);


    const rgb = `rgb(${r}, ${g}, ${b})`;
    spanCorOlho.parentNode.style.backgroundColor = rgb;
  });
}

function getAverageColor(points) {
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  points.forEach(point => {
    const { x, y } = point;
    const pixelData = contextSkin.getImageData(x, y, 1, 1).data; 

    totalR += pixelData[0];
    totalG += pixelData[1];
    totalB += pixelData[2];
    count++;
  });

  console.log(totalB, totalR, totalG);

  return {
    r: Math.floor(totalR / count),
    g: Math.floor(totalG / count),
    b: Math.floor(totalB / count)
  };
}

function getSkinColor (detections) {
  canvasPele.width = video.videoWidth;
  canvasPele.height = video.videoHeight;

  contextSkin.drawImage(video, 0, 0, canvasPele.width, canvasPele.height);

  const landmarks = detections.landmarks;
    
  console.log(landmarks);
  const leftCheekPoint = landmarks.positions[3];   
  const rightCheekPoint = landmarks.positions[13];
  const foreheadPoint = landmarks.positions[19];   

  const skinColor = getAverageColor([leftCheekPoint, rightCheekPoint, foreheadPoint]);
  const skinColorRgb = `rgb(${skinColor.r}, ${skinColor.g}, ${skinColor.b})`;
  console.log(skinColorRgb);
  return skinColorRgb;  
}



video.addEventListener('play', function () {
  onPlay()
})

loadModels().then(startVideo);
