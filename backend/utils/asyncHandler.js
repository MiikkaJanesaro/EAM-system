// Express 4 ei välitä hylättyjä (rejected) promiseja automaattisesti
// virhekäsittelijälle. Nyt kun db.js tekee verkkokutsuja DynamoDB:hen,
// virheet pitää napata eksplisiittisesti - muuten pyyntö jää roikkumaan.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
