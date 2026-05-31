// ============================================================
// basic.js - Google Maps API の基本サンプル
// ============================================================

let map;
let marker;
let geocoder;
let infoWindow;

const defaultPlace = {
  name: '東京駅',
  position: { lat: 35.681236, lng: 139.767125 },
  address: '東京都千代田区丸の内1丁目',
};

const sampleSpots = [
  {
    name: '東京タワー',
    position: { lat: 35.658581, lng: 139.745433 },
    address: '東京都港区芝公園4丁目2-8',
  },
  {
    name: '浅草寺',
    position: { lat: 35.714765, lng: 139.796655 },
    address: '東京都台東区浅草2丁目3-1',
  },
  {
    name: '新宿御苑',
    position: { lat: 35.685176, lng: 139.710052 },
    address: '東京都新宿区内藤町11',
  },
];

function loadGoogleMapsApi() {
  const apiKey = window.GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'YOUR_API_KEY') {
    window.addEventListener('DOMContentLoaded', () => {
      setMessage('js/config.js に Google Maps API キーを設定してください。', true);
    });
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=initMap`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    setMessage('Google Maps API を読み込めませんでした。API キーやネットワークを確認してください。', true);
  };
  document.head.appendChild(script);
}

// Google Maps API の callback=initMap から呼ばれるため、window に公開する。
window.initMap = function initMap() {
  geocoder = new google.maps.Geocoder();
  infoWindow = new google.maps.InfoWindow();

  map = new google.maps.Map(document.getElementById('map'), {
    center: defaultPlace.position,
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  marker = createMarker(defaultPlace);
  addSampleSpotMarkers();
  bindEvents();
  setMessage('初期表示は東京駅です。住所や施設名で検索できます。');
};

loadGoogleMapsApi();

function bindEvents() {
  const addressInput = document.getElementById('address');
  const searchButton = document.getElementById('btn-search');
  const currentButton = document.getElementById('btn-current');

  searchButton.addEventListener('click', searchAddress);
  currentButton.addEventListener('click', showCurrentLocation);

  addressInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      searchAddress();
    }
  });
}

function searchAddress() {
  const address = document.getElementById('address').value.trim();

  if (!address) {
    setMessage('住所を入力してください。', true);
    return;
  }

  setMessage('住所を検索しています...');

  geocoder.geocode({ address }, (results, status) => {
    if (status !== 'OK' || !results[0]) {
      setMessage('住所が見つかりませんでした。別のキーワードで試してください。', true);
      return;
    }

    const result = results[0];
    const place = {
      name: address,
      position: result.geometry.location,
      address: result.formatted_address,
    };

    moveToPlace(place, 16);
    setMessage(`${result.formatted_address} を表示しました。`);
  });
}

function showCurrentLocation() {
  if (!navigator.geolocation) {
    setMessage('このブラウザは現在地取得に対応していません。', true);
    return;
  }

  setMessage('現在地を取得しています...');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const place = {
        name: '現在地',
        position: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        address: 'ブラウザの Geolocation API で取得した位置です。',
      };

      moveToPlace(place, 16);
      setMessage('現在地を表示しました。');
    },
    () => {
      setMessage('現在地を取得できませんでした。ブラウザの許可設定を確認してください。', true);
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    },
  );
}

function moveToPlace(place, zoom) {
  marker.setMap(null);
  marker = createMarker(place);
  map.setCenter(place.position);
  map.setZoom(zoom);
  openInfoWindow(place, marker);
}

function createMarker(place) {
  const nextMarker = new google.maps.Marker({
    position: place.position,
    map,
    title: place.name,
  });

  nextMarker.addListener('click', () => {
    openInfoWindow(place, nextMarker);
  });

  return nextMarker;
}

function addSampleSpotMarkers() {
  sampleSpots.forEach((spot) => {
    const spotMarker = new google.maps.Marker({
      position: spot.position,
      map,
      title: spot.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#2563eb',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      },
    });

    spotMarker.addListener('click', () => {
      openInfoWindow(spot, spotMarker);
    });
  });
}

function openInfoWindow(place, targetMarker) {
  const escapedName = escapeHtml(place.name);
  const escapedAddress = escapeHtml(place.address);

  infoWindow.setContent(`
    <div style="min-width: 180px">
      <p style="margin: 0 0 4px; font-weight: 700;">${escapedName}</p>
      <p style="margin: 0; color: #475569;">${escapedAddress}</p>
    </div>
  `);
  infoWindow.open(map, targetMarker);
}

function setMessage(text, isError = false) {
  const message = document.getElementById('message');
  message.textContent = text;
  message.className = `mt-3 min-h-5 text-sm ${isError ? 'text-red-600' : 'text-slate-600'}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
