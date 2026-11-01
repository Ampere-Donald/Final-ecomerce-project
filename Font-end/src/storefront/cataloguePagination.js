// The public catalogue query requests 24 rows and supports pages up to 1e6.
// A failed or inconsistent response never proves that a page is absent.
export function invalidCataloguePage(params) {
  if (!params.has('page')) return false;
  const value = params.get('page');
  return params.getAll('page').length !== 1 || !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) || Number(value) > 1000000;
}

export function missingCataloguePage(params, result) {
  if (invalidCataloguePage(params)) return false;
  const page = Number(params.get('page') || 1);
  const total = result?.meta?.total, lastPage = result?.meta?.lastPage;
  return page > 1 && Array.isArray(result?.data) && result.data.length === 0 &&
    Number.isSafeInteger(total) && total >= 0 &&
    Number.isSafeInteger(lastPage) && lastPage === Math.ceil(total / 24) &&
    page > Math.max(1, lastPage);
}
