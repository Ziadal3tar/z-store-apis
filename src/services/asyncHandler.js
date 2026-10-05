export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const globalError = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = Number(err?.statusCode || err?.status || err?.cause) || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error.'
    : String(err?.message || 'Something went wrong.');

  if (process.env.NODE_ENV !== 'production') {
    return res.status(status).json({
      message,
      status,
      stack: err?.stack,
    });
  }

  return res.status(status).json({ message, status });
};
