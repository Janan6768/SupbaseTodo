    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

    const SUPABASE_URL = "https://voirrhswqgvacdtsoxry.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvaXJyaHN3cWd2YWNkdHNveHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDE3ODIsImV4cCI6MjA3MzMxNzc4Mn0.xpWV4UVRmfeAURPi4di8CViRuyZASgfVBK1yiE_Bq_4";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const BUCKET = 'todo-images'

    // Refs
    const signupForm = document.getElementById('signupForm')
    const signinForm = document.getElementById('signinForm')
    const signupMsg = document.getElementById('signupMsg')
    const signinMsg = document.getElementById('signinMsg')
    const appUI = document.getElementById('appUI')
    const authDiv = document.getElementById('auth')
    const userEmail = document.getElementById('userEmail')
    const signOutBtn = document.getElementById('signOutBtn')
    const todoForm = document.getElementById('todoForm')
    const titleInput = document.getElementById('title')
    const descInput = document.getElementById('description')
    const imageInput = document.getElementById('imageInput')
    const preview = document.getElementById('preview')
    const progressBar = document.getElementById('progressBar').firstElementChild
    const todoMsg = document.getElementById('todoMsg')
    const todosBody = document.getElementById('todosBody')

    // Edit modal refs
    const editModal = document.getElementById('editModal')
    const editTitle = document.getElementById('editTitle')
    const editDesc = document.getElementById('editDesc')
    const editImageInput = document.getElementById('editImageInput')
    const editPreview = document.getElementById('editPreview')
    const editProgress = document.getElementById('editProgress').firstElementChild
    const cancelEdit = document.getElementById('cancelEdit')
    const saveEdit = document.getElementById('saveEdit')
    let editingId = null
    let editFile = null

    // preview for add
    imageInput.addEventListener('change', (e) => {
      const f = e.target.files[0]
      if (f) {
        preview.src = URL.createObjectURL(f)
        preview.classList.remove('hidden')
      } else preview.classList.add('hidden')
    })

    // preview for edit
    editImageInput.addEventListener('change', (e) => {
      const f = e.target.files[0]
      editFile = f || null
      if (f) {
        editPreview.src = URL.createObjectURL(f)
        editPreview.classList.remove('hidden')
      }
    })

    // sign up
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      signupMsg.textContent = ''
      const email = document.getElementById('signupEmail').value
      const password = document.getElementById('signupPassword').value
      const { error } = await supabase.auth.signUp({ email, password })
      signupMsg.textContent = error ? error.message : 'Check your email for confirmation.'
    })

    // sign in
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      signinMsg.textContent = ''
      const email = document.getElementById('signinEmail').value
      const password = document.getElementById('signinPassword').value
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      signinMsg.textContent = error ? error.message : ''
    })

    signOutBtn.addEventListener('click', async () => { await supabase.auth.signOut() })

    // add todo
    todoForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      todoMsg.textContent = ''
      const title = titleInput.value.trim()
      const description = descInput.value.trim()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return todoMsg.textContent = 'You must be signed in.'

      let imagePath = null
      const file = imageInput.files[0]
      if (file) {
  progressBar.style.width = "0%";
  document.getElementById('progressBar').classList.remove('hidden');

  // Fake smooth animation while uploading
  let fakeProgress = 0;
  const interval = setInterval(() => {
    if (fakeProgress < 90) {
      fakeProgress += 10;
      progressBar.style.width = fakeProgress + "%";
    }
  }, 300);

  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}.${ext}`;
  const path = `${user.id}/${fileName}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);

  clearInterval(interval); // stop fake progress

  if (uploadError) return todoMsg.textContent = 'Upload failed: ' + uploadError.message;

  imagePath = path;
  progressBar.style.width = "100%";
  setTimeout(() => document.getElementById('progressBar').classList.add('hidden'), 700);
}


      const { error } = await supabase.from('todos').insert([{ user_id: user.id, title, description, image_path: imagePath }])
      if (!error) {
        todoForm.reset()
        preview.classList.add('hidden')
        loadTodos()
      }
    })

    supabase.auth.onAuthStateChange((_, session) => updateUI(session?.user ?? null))
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      updateUI(data.user ?? null)
    })()

    async function updateUI(user) {
      if (user) {
        authDiv.style.display = 'none'
        appUI.classList.remove('hidden')
        userEmail.textContent = user.email
        loadTodos()
      } else {
        authDiv.style.display = 'grid'
        appUI.classList.add('hidden')
      }
    }

    // load todos
    async function loadTodos() {
      todosBody.innerHTML = ''
      const { data, error } = await supabase.from('todos').select('*').order('created_at', { ascending: false })
      if (error) return todosBody.innerHTML = `<tr><td colspan="5" class="p-2 text-red-400">Error: ${error.message}</td></tr>`
      if (!data.length) return todosBody.innerHTML = `<tr><td colspan="5" class="p-2 text-slate-400">No todos yet</td></tr>`

      for (const t of data) {
        let imgHtml = ''
        if (t.image_path) {
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(t.image_path)
          imgHtml = `<img src="${pub.publicUrl}" class="h-16 w-16 object-cover rounded" />`
        }
        const row = document.createElement('tr')
        row.className = "border-b border-slate-700"
        row.innerHTML = `
          <td class="p-2">${escapeHtml(t.title)}</td>
          <td class="p-2">${imgHtml}</td>
          <td class="p-2">${escapeHtml(t.description || '')}</td>
          <td class="p-2 text-xs">${new Date(t.created_at).toLocaleString()}</td>
          <td class="p-2 flex gap-2">
            <button class="editBtn bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs" data-id="${t.id}">✏️</button>
            <button class="deleteBtn bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs" data-id="${t.id}">🗑️</button>
          </td>
        `
        todosBody.appendChild(row)
      }

      document.querySelectorAll('.deleteBtn').forEach(btn =>
        btn.addEventListener('click', async () => {
          await supabase.from('todos').delete().eq('id', btn.dataset.id)
          loadTodos()
        })
      )

      document.querySelectorAll('.editBtn').forEach(btn =>
        btn.addEventListener('click', async () => {
          editingId = btn.dataset.id
          const { data } = await supabase.from('todos').select('*').eq('id', editingId).single()
          editTitle.value = data.title
          editDesc.value = data.description || ''
          if (data.image_path) {
            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.image_path)
            editPreview.src = pub.publicUrl
            editPreview.classList.remove('hidden')
          }
          editModal.classList.remove('hidden')
        })
      )
    }

    cancelEdit.addEventListener('click', () => {
      editModal.classList.add('hidden')
      editingId = null
      editFile = null
    })

    saveEdit.addEventListener('click', async () => {
      if (!editingId) return
      let updateObj = { title: editTitle.value, description: editDesc.value }
      if (editFile) {
        editProgress.style.width = "0%"
        document.getElementById('editProgress').classList.remove('hidden')
        const { data: { user } } = await supabase.auth.getUser()
        const ext = editFile.name.split('.').pop()
        const fileName = `${Date.now()}.${ext}`
        const path = `${user.id}/${fileName}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, editFile)
        if (!uploadError) {
          updateObj.image_path = path
          editProgress.style.width = "100%"
          setTimeout(() => document.getElementById('editProgress').classList.add('hidden'), 500)
        }
      }
      await supabase.from('todos').update(updateObj).eq('id', editingId)
      editModal.classList.add('hidden')
      editingId = null
      editFile = null
      loadTodos()
    })

    function escapeHtml(str) {
      return str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    }
