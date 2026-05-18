export function getCookie(name) {
  const cookieValue = document.cookie.split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`));

  if (cookieValue) {
    const [, value] = cookieValue.split('=');
    return decodeURIComponent(value);
  }

  return null;
}
