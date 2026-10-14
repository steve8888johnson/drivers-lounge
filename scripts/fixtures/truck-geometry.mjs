// Synthetic, non-drivable fixtures. Official published vector is tested separately.
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export function encodePoints(points, precision = 5) {
  function integer(value) {
    let result = '';
    do { const digit = value % 32; value = Math.floor(value / 32); result += alphabet[digit + (value ? 32 : 0)]; } while (value);
    return result;
  }
  let encoded = 'B' + integer(precision), last = [0, 0];
  for (const point of points) {
    [point.lat, point.lng].forEach((coordinate, index) => {
      const next = Math.round(coordinate * 10 ** precision), delta = next - last[index];
      encoded += integer(delta < 0 ? -2 * delta - 1 : 2 * delta); last[index] = next;
    });
  }
  return encoded;
}
export const tripFixture = () => ({origin: {lat:32,lng:-102}, destination: {lat:32.001,lng:-102}});
export function sectionFixture(id = 's1', start = 32, end = 32.001) {
  const first = {lat:start,lng:-102}, last = {lat:end,lng:-102};
  return {id,type:'vehicle',transport:{mode:'truck'},polyline:encodePoints([first,last]),
    departure:{place:{location:first}},arrival:{place:{location:last}},summary:{length:Math.round(Math.abs(end-start)*111195)}};
}
