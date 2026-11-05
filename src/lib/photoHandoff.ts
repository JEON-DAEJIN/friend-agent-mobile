// 카메라 화면 → 대화 화면으로 찍은 사진을 넘기는 작은 보관함.
// 처음에는 사진 주소(file:///…)를 화면 이동 주소의 params 로 넘겼는데, 카메라에서만 OCR 요청이 폰 안에서 실패했다
// (사진첩은 같은 readPhoto 로 성공 — N057 실습). 긴 파일 주소가 화면 이동 주소에 실렸다 꺼내지며 바뀌었을 가능성이 커서,
// 주소를 화면 이동에 싣지 않고 이 보관함에 넣어 두었다가 대화 화면이 다시 보일 때 꺼내 쓴다.
export type PickedPhoto = { uri: string; mimeType?: string | null; fileName?: string | null };

let pending: PickedPhoto | null = null;

export function setPendingPhoto(photo: PickedPhoto) {
  pending = photo;
}

// 한 번 꺼내면 비운다(같은 사진을 두 번 읽지 않게)
export function takePendingPhoto(): PickedPhoto | null {
  const photo = pending;
  pending = null;
  return photo;
}
