document.addEventListener("DOMContentLoaded", () => {
  pell.init({
    element: document.getElementById('editor'),
    onChange: html => document.emailHtml = html,
    defaultParagraphSeparator: 'p',
    styleWithCSS: true,
    actions: [
      'bold',
      'underline',
      {
        name: 'italic',
        result: () => pell.exec('italic')
      },
      {
        name: 'link',
        result: () => {
          const url = window.prompt('Enter the link URL')
          if (url) pell.exec('createLink', url)
        }
      }
    ]
  })
  
  document.querySelector('button#send').addEventListener('click', (event) => {        
    axios.post('/send', {
      content: document.emailHtml
    }).then(() => {
      document.querySelector('button#send').innerText = 'Sent!'
      document.querySelector('button#send').disabled = true
    }).catch(err => {
      console.error(err) 
      alert('An error occurred! Check the console log')
    })
  })

})