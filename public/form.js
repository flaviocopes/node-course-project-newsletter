document.addEventListener("DOMContentLoaded", () => {
  document.querySelector('form').addEventListener('submit', (event) => {
    event.stopPropagation()
    event.preventDefault()
    
    const name = document.querySelectorAll('form input[name="name"]')[0].value
    const email = document.querySelectorAll('form input[name="email"]')[0].value

	  if (!validator.isAscii(name) || !validator.isLength(name, { min: 3, max: 100 })) {
		  alert('Name must be alphanumeric and between 3 and 100 chars')
		  return
	  }
    
    axios.post('/form', {
      name, 
      email
    }).then(() => {
      for (const item of document.querySelectorAll('main *')) { item.remove() }
      
      const p = document.createElement('p')
      const text = document.createTextNode('Success!')
      p.appendChild(text)
      document.querySelector('main').appendChild(p)
    })
  })
})
