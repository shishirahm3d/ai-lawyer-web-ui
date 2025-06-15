// System prompt 
const SYSTEM_PROMPT = {
  role: "system",
  content:
    "You are an AI Lawyer, highly specialized in Bangladeshi law. You have been trained by DIU CSE AI Team Members 'Shishir Ahmed' & 'Ashikul Islam'. Your primary role is to assist users by answering legal questions with accurate, simple, and understandable explanations. You must carefully interpret each query, refer to relevant laws, and explain legal terms in clear, everyday language. If a user asks a question in Bangla, respond in Bangla; if the question is in English, respond in English. Avoid giving personal opinions, and always maintain a factual, respectful, and clear tone. Important: Only respond to queries related to Bangladeshi law. If the question is unrelated to the law or involves topics like programming, technical support, or non-legal subjects, respond with: I can only assist with legal questions regarding Bangladeshi law. If you are unsure about any legal query, kindly inform the user that the matter may require consultation with a licensed legal professional. Do not answer questions unrelated to law, and never offer advice outside the legal domain.",
}

// Global variables
let currentChatId = null
let messages = []
let isTyping = false
let selectedChatFilename = null
let appSettings = {
  model: "hf.co/shishirahm3d/ai-lawyer-bd-1-8b-instruct-bnb-4bit-GGUF:Q4_K_M",
  apiUrl: "http://203.190.9.169:11434/api/chat",
  temperature: 0.8,
}

// API Configuration - Updated paths
const API_CONFIG = {
  chatEndpoint: "./api/chat.php",
  saveEndpoint: "./api/save_chat.php",
  loadEndpoint: "./api/load_chat.php",
  historyEndpoint: "./api/chat_history.php",
  deleteEndpoint: "./api/delete_chat.php",
  renameEndpoint: "./api/rename_chat.php",
  settingsEndpoint: "./api/settings.php",
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  loadChatHistory()
  setupEventListeners()
  loadSettings()
  initDarkMode()
})

function initializeApp() {
  const messageInput = document.getElementById("messageInput")
  const sendButton = document.getElementById("sendButton")

  // Enable send button when there's text
  messageInput.addEventListener("input", function () {
    const hasText = this.value.trim().length > 0
    sendButton.disabled = !hasText || isTyping

    // Auto-resize textarea
    this.style.height = "auto"
    this.style.height = Math.min(this.scrollHeight, 120) + "px"
  })
}

// Add this function to initialize dark mode
function initDarkMode() {
  const darkModeEnabled = localStorage.getItem("darkMode") === "true"
  if (darkModeEnabled) {
    document.body.classList.add("dark-mode")
    document.getElementById("themeIcon").classList.remove("fa-moon")
    document.getElementById("themeIcon").classList.add("fa-sun")
  }
}

// Add this function to toggle dark mode
function toggleDarkMode() {
  const isDarkMode = document.body.classList.toggle("dark-mode")
  const themeIcon = document.getElementById("themeIcon")

  if (isDarkMode) {
    themeIcon.classList.remove("fa-moon")
    themeIcon.classList.add("fa-sun")
  } else {
    themeIcon.classList.remove("fa-sun")
    themeIcon.classList.add("fa-moon")
  }

  localStorage.setItem("darkMode", isDarkMode)
}

function setupEventListeners() {
  // Focus on input when page loads
  document.getElementById("messageInput").focus()

  // Temperature slider
  const temperatureSlider = document.getElementById("temperatureInput")
  const temperatureValue = document.getElementById("temperatureValue")

  if (temperatureSlider) {
    temperatureSlider.addEventListener("input", function () {
      temperatureValue.textContent = this.value
    })
  }

  // Close context menu on click outside
  document.addEventListener("click", (e) => {
    const contextMenu = document.getElementById("contextMenu")
    if (contextMenu && contextMenu.style.display === "block") {
      contextMenu.style.display = "none"
    }
  })
}

// Close mobile sidebar on outside click
document.addEventListener("click", (event) => {
  const sidebar = document.getElementById("sidebar")
  const toggleBtn = document.querySelector(".sidebar-toggle")

  if (
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !toggleBtn.contains(event.target)
  ) {
    sidebar.classList.remove("open")
  }
})

function handleKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    if (!isTyping && document.getElementById("messageInput").value.trim()) {
      sendMessage()
    }
  }
}

async function sendMessage() {
  const messageInput = document.getElementById("messageInput")
  const message = messageInput.value.trim()

  if (!message || isTyping) return

  // Clear input and disable send button
  messageInput.value = ""
  messageInput.style.height = "auto"
  document.getElementById("sendButton").disabled = true

  // Add user message to chat
  addMessage("user", message)

  // Show typing indicator
  showTypingIndicator()

  // Prepare messages for API
  const apiMessages = [SYSTEM_PROMPT, ...messages]

  try {
    // Update status
    updateStatus("Thinking...", "thinking")

    console.log("Sending request to:", API_CONFIG.chatEndpoint) // Debug log

    // Send to API
    const response = await fetch(API_CONFIG.chatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: apiMessages,
        parameters: {
          temperature: appSettings.temperature,
          top_k: 40,
          repeat_penalty: 1.1,
          min_p_sampling: 0.05,
          top_p: 0.95,
        },
        model: appSettings.model,
        apiUrl: appSettings.apiUrl,
      }),
    })

    console.log("Response status:", response.status) // Debug log

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("Response data:", data) // Debug log

    // Hide typing indicator
    hideTypingIndicator()

    if (data.success) {
      // Add assistant response with typing effect
      await addMessageWithTypingEffect("assistant", data.response)
    } else {
      addMessage("assistant", `Error: ${data.error || "Unknown error occurred"}`)
    }
  } catch (error) {
    console.error("Error details:", error)
    hideTypingIndicator()

    // More specific error messages
    let errorMessage = "Sorry, I encountered an error while processing your request."

    if (error.message.includes("404")) {
      errorMessage = "API endpoint not found. Please check if the API files are properly uploaded to the 'api' folder."
    } else if (error.message.includes("Failed to fetch")) {
      errorMessage = "Network error. Please check your internet connection and server configuration."
    }

    addMessage("assistant", errorMessage)
  } finally {
    updateStatus("Ready", "ready")
    document.getElementById("sendButton").disabled = false
    document.getElementById("messageInput").focus()
  }
}

function addMessage(role, content) {
  // Remove welcome message if it exists
  const welcomeMessage = document.querySelector(".welcome-message")
  if (welcomeMessage) {
    welcomeMessage.remove()
  }

  // Add to messages array
  messages.push({ role, content })

  // Create message element
  const chatContainer = document.getElementById("chatContainer")
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${role}`

  const avatar = document.createElement("div")
  avatar.className = "message-avatar"
  avatar.innerHTML = role === "user" ? '<i class="fas fa-user"></i>' : "⚖️"

  const messageContent = document.createElement("div")
  messageContent.className = "message-content"
  messageContent.textContent = content

  messageDiv.appendChild(avatar)
  messageDiv.appendChild(messageContent)

  chatContainer.appendChild(messageDiv)

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight
}

async function addMessageWithTypingEffect(role, content) {
  // Remove welcome message if it exists
  const welcomeMessage = document.querySelector(".welcome-message")
  if (welcomeMessage) {
    welcomeMessage.remove()
  }

  // Add to messages array
  messages.push({ role, content })

  // Create message element
  const chatContainer = document.getElementById("chatContainer")
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${role}`

  const avatar = document.createElement("div")
  avatar.className = "message-avatar"
  avatar.innerHTML = role === "user" ? '<i class="fas fa-user"></i>' : "⚖️"

  const messageContent = document.createElement("div")
  messageContent.className = "message-content"

  messageDiv.appendChild(avatar)
  messageDiv.appendChild(messageContent)
  chatContainer.appendChild(messageDiv)

  // Typing effect
  let currentText = ""
  const words = content.split(" ")

  for (let i = 0; i < words.length; i++) {
    currentText += (i > 0 ? " " : "") + words[i]
    messageContent.textContent = currentText
    chatContainer.scrollTop = chatContainer.scrollHeight
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

function showTypingIndicator() {
  isTyping = true
  const chatContainer = document.getElementById("chatContainer")

  const typingDiv = document.createElement("div")
  typingDiv.className = "message assistant"
  typingDiv.id = "typingIndicator"

  const avatar = document.createElement("div")
  avatar.className = "message-avatar"
  avatar.innerHTML = "⚖️"

  const messageContent = document.createElement("div")
  messageContent.className = "message-content"

  const typingIndicator = document.createElement("div")
  typingIndicator.className = "typing-indicator"
  typingIndicator.innerHTML =
    '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>'

  messageContent.appendChild(typingIndicator)
  typingDiv.appendChild(avatar)
  typingDiv.appendChild(messageContent)

  chatContainer.appendChild(typingDiv)
  chatContainer.scrollTop = chatContainer.scrollHeight
}

function hideTypingIndicator() {
  isTyping = false
  const typingIndicator = document.getElementById("typingIndicator")
  if (typingIndicator) {
    typingIndicator.remove()
  }
}

function updateStatus(text, type) {
  const statusText = document.getElementById("statusText")
  const statusDot = document.querySelector(".status-dot")

  statusText.textContent = text

  // Update status dot color
  statusDot.className = "status-dot"
  if (type === "thinking") {
    statusDot.style.background = "#ff9500"
  } else if (type === "ready") {
    statusDot.style.background = "#10a37f"
  }
}

function startNewChat() {
  // Auto-save if there are messages
  if (messages.length > 0) {
    saveCurrentChat(true) // Pass true to indicate auto-save
  }

  messages = []
  currentChatId = null

  const chatContainer = document.getElementById("chatContainer")
  chatContainer.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon">⚖️</div>
      <h2>Welcome to AI Lawyer</h2>
      <p>I'm an AI assistant trained specifically on Bangladeshi law. I can help you with legal questions, provide explanations, and guide you through legal concepts. Feel free to ask in English or Bangla!</p>
    </div>
  `

  document.getElementById("messageInput").focus()
}

async function saveCurrentChat(autoSave = false) {
  if (messages.length === 0) {
    if (!autoSave) {
      alert("No chat messages to save.")
    }
    return
  }

  try {
    const response = await fetch(API_CONFIG.saveEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    })

    const data = await response.json()

    if (data.success) {
      if (!autoSave) {
        alert("Chat saved successfully!")
      }
      loadChatHistory()
    } else {
      if (!autoSave) {
        alert("Error saving chat: " + data.error)
      }
    }
  } catch (error) {
    console.error("Error saving chat:", error)
    if (!autoSave) {
      alert("Error saving chat. Please try again.")
    }
  }
}

function downloadChatLog() {
  if (messages.length === 0) {
    alert("No chat messages to download.")
    return
  }

  const chatLog = messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n")
  const blob = new Blob([chatLog], { type: "text/plain" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = "chat_log.txt"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Add function to show context menu for chat history items
function showContextMenu(event, filename) {
  event.preventDefault()
  selectedChatFilename = filename

  const contextMenu = document.getElementById("contextMenu")
  contextMenu.style.display = "block"
  contextMenu.style.left = event.pageX + "px"
  contextMenu.style.top = event.pageY + "px"
}

// Add function to delete a chat
async function deleteSelectedChat() {
  if (!selectedChatFilename) return

  if (confirm("Are you sure you want to delete this chat?")) {
    try {
      const response = await fetch(API_CONFIG.deleteEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedChatFilename,
        }),
      })

      const data = await response.json()

      if (data.success) {
        loadChatHistory()
      } else {
        alert("Error deleting chat: " + data.error)
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
      alert("Error deleting chat. Please try again.")
    }
  }

  document.getElementById("contextMenu").style.display = "none"
}

// Add function to open rename modal
function openRenameModal() {
  if (!selectedChatFilename) return

  document.getElementById("chatToRename").value = selectedChatFilename
  document.getElementById("renameChatModal").style.display = "flex"
  document.getElementById("contextMenu").style.display = "none"
}

// Add function to close rename modal
function closeRenameModal() {
  document.getElementById("renameChatModal").style.display = "none"
}

// Add function to rename a chat
async function renameChat() {
  const filename = document.getElementById("chatToRename").value
  const newName = document.getElementById("newChatNameInput").value.trim()

  if (!filename || !newName) return

  try {
    const response = await fetch(API_CONFIG.renameEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: filename,
        newName: newName,
      }),
    })

    const data = await response.json()

    if (data.success) {
      closeRenameModal()
      loadChatHistory()
    } else {
      alert("Error renaming chat: " + data.error)
    }
  } catch (error) {
    console.error("Error renaming chat:", error)
    alert("Error renaming chat. Please try again.")
  }
}

// Add function to open settings modal
function openSettings() {
  document.getElementById("modelInput").value = appSettings.model
  document.getElementById("apiUrlInput").value = appSettings.apiUrl
  document.getElementById("temperatureInput").value = appSettings.temperature
  document.getElementById("temperatureValue").textContent = appSettings.temperature

  document.getElementById("settingsModal").style.display = "flex"
}

// Add function to close settings modal
function closeSettings() {
  document.getElementById("settingsModal").style.display = "none"
}

// Add function to save settings
async function saveSettings() {
  const model = document.getElementById("modelInput").value.trim()
  const apiUrl = document.getElementById("apiUrlInput").value.trim()
  const temperature = Number.parseFloat(document.getElementById("temperatureInput").value)

  if (!model || !apiUrl) {
    alert("Please fill in all fields.")
    return
  }

  appSettings = {
    model,
    apiUrl,
    temperature,
  }

  try {
    const response = await fetch(API_CONFIG.settingsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appSettings),
    })

    const data = await response.json()

    if (data.success) {
      alert("Settings saved successfully!")
      closeSettings()
    } else {
      alert("Error saving settings: " + data.error)
    }
  } catch (error) {
    console.error("Error saving settings:", error)
    alert("Error saving settings. Please try again.")
  }
}

// Add function to load settings
async function loadSettings() {
  try {
    const response = await fetch(API_CONFIG.settingsEndpoint)
    const data = await response.json()

    if (data.success && data.settings) {
      appSettings = {
        model: data.settings.model || appSettings.model,
        apiUrl: data.settings.apiUrl || appSettings.apiUrl,
        temperature: data.settings.temperature || appSettings.temperature,
      }
    }
  } catch (error) {
    console.error("Error loading settings:", error)
  }
}

async function loadChatHistory() {
  try {
    const response = await fetch(API_CONFIG.historyEndpoint)
    const data = await response.json()

    if (data.success) {
      const historyList = document.getElementById("chatHistoryList")
      historyList.innerHTML = ""

      data.chats.forEach((chat) => {
        const chatItem = document.createElement("div")
        chatItem.className = "chat-history-item"
        chatItem.textContent = chat.title
        chatItem.onclick = () => loadChat(chat.filename)
        chatItem.oncontextmenu = (e) => showContextMenu(e, chat.filename)
        historyList.appendChild(chatItem)
      })
    }
  } catch (error) {
    console.error("Error loading chat history:", error)
  }
}

async function loadChat(filename) {
  try {
    const response = await fetch(API_CONFIG.loadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: filename }),
    })

    const data = await response.json()

    if (data.success) {
      messages = data.messages
      displayLoadedChat()
    } else {
      alert("Error loading chat: " + data.error)
    }
  } catch (error) {
    console.error("Error loading chat:", error)
    alert("Error loading chat. Please try again.")
  }
}

function displayLoadedChat() {
  const chatContainer = document.getElementById("chatContainer")
  chatContainer.innerHTML = ""

  messages.forEach((message) => {
    if (message.role !== "system") {
      addMessage(message.role, message.content)
    }
  })
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar")
  sidebar.classList.toggle("open")
}

function toggleChatHistory() {
  const historyList = document.getElementById("chatHistoryList")
  historyList.style.display = historyList.style.display === "none" ? "block" : "none"
}

// Show loading modal
function showLoading() {
  document.getElementById("loadingModal").style.display = "flex"
}

// Hide loading modal
function hideLoading() {
  document.getElementById("loadingModal").style.display = "none"
}
