(function(){
    let senderID;
    const socket = io();

    socket.on("connect", () => {
        console.log("Receiver connected with ID:", socket.id);
    });

    document.querySelector("#receiver-start-con-btn").addEventListener("click", function(){
        senderID = document.querySelector("#join-id").value;
        if (senderID.length === 0) {
            alert("Please enter a valid Join ID.");
            return;
        }
        let joinID = `${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}`;

        socket.emit("receiver-join", {
            uid: joinID,
            sender_uid: senderID
        });

        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".fs-screen").classList.add("active");
    });

    let fileShare = {};
    socket.on("fs-meta", function(metadata){
        fileShare.metadata = metadata;
        fileShare.transmitted = 0;
        fileShare.buffer = [];

        let el = document.createElement("div");
        el.classList.add("item");
        el.innerHTML = `
            <div class="progress">0%</div>
            <div class="filename">${metadata.filename}</div>
        `;
        document.querySelector(".files-list").appendChild(el);
        fileShare.progress_node = el.querySelector(".progress");

        socket.emit("fs-start", {
            uid: senderID
        });
    });

    socket.on("fs-share", function(data){
        if (data.buffer) {
            console.log("Received chunk of size:", data.buffer.byteLength);
            fileShare.buffer.push(data.buffer);
            fileShare.transmitted += data.buffer.byteLength;
            fileShare.progress_node.innerText = Math.trunc(fileShare.transmitted / fileShare.metadata.total_buffer_size * 100) + "%";

            if (fileShare.transmitted === fileShare.metadata.total_buffer_size) {
                console.log("Download complete");
                const blob = new Blob(fileShare.buffer);
                console.log("Blob created with size:", blob.size);
                download(blob, fileShare.metadata.filename);
                fileShare = {};  // reset after completion
            } else {
                console.log("Requesting next chunk...");
                socket.emit("request-chunk", {
                    chunkIndex: fileShare.buffer.length // Request the next chunk
                });
            }
        } else {
            console.error("Received data is missing the buffer:", data);
        }
    });

    // Chat functionality
    document.querySelector("#send-chat-btn").addEventListener("click", function() {
        const message = document.querySelector("#chat-input").value;
        if (message) {
            socket.emit("chat-message", { uid: senderID, message: message });
            document.querySelector("#chat-input").value = ""; // Clear input
            addChatMessage("You: " + message);
        }
    });

    socket.on("chat-message", function(data) {
        addChatMessage("Sender: " + data.message);
    });

    function addChatMessage(message) {
        const chatBox = document.querySelector("#chat-box");
        const messageElement = document.createElement("p");
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }
})();