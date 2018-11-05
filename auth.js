const jwt = require('jsonwebtoken')

exports.createJWT = options => {
  return jwt.sign({}, process.env.JWT_SECRET, {
    expiresIn: options.maxAge || 3600
  })
}

exports.verifyJWT = token => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err || !decodedToken) {
        return reject(err)
      }
      resolve(decodedToken)
    })
  })
}
