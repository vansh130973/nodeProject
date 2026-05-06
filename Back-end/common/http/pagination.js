/**
 * Parse and clamp page number from query values.
 * @param {unknown} value
 * @param {number} [fallback=1]
 * @returns {number}
 */
export const parsePage = (value, fallback = 1) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, parsed);
};

/**
 * Parse and clamp page size.
 * Supports "all" to disable pagination.
 * @param {unknown} value
 * @param {number} [fallback=10]
 * @param {number} [max=100]
 * @returns {number|"all"}
 */
export const parseLimit = (value, fallback = 10, max = 100) => {
  if (String(value).toLowerCase() === "all") return "all";
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(1, parsed));
};

/**
 * Build a shared pagination metadata object.
 * @param {{total:number,page:number,limit:number|"all"}} args
 * @returns {{total:number,page:number,limit:number|"all",totalPages:number,hasNextPage:boolean,hasPrevPage:boolean}}
 */
export const buildPaginationMeta = ({ total, page, limit }) => {
  const totalPages = limit === "all" ? 1 : Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
