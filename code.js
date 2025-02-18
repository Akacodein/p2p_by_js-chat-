(function(){
    let receiverID;
    const socket = io();

    socket.on("connect", () => {
        console.log("Sender connected with ID:", socket.id);
    });

    function generateID(){
        return `${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}`;
    }

    document.querySelector("#sender-start-con-btn").addEventListener("click", function(){
        let joinID = generateID();
        document.querySelector("#join-id").innerHTML= `
            <b>Room ID</b>
            <span>${joinID}</span>
        `;
        socket.emit("sender-join", {
            uid: joinID
        });
    });

    socket.on("init", function(uid){
        receiverID = uid;
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".fs-screen").classList.add("active");
    });

    document.querySelector("#file-input").addEventListener("change", function(e){
        let file = e.target.files[0];
        if (!file) {
            console.log("No file selected.");
            return;
        }
        console.log("File selected:", file.name);
        let reader = new FileReader();
        reader.onload = function(e){
            let buffer = new Uint8Array(reader.result);
            console.log("File buffer created with size:", buffer.length);

            let el = document.createElement("div");
            el.classList.add("item");
            el.innerHTML = `
                <div class="progress">0%</div>
                <div class="filename">${file.name}</div>
            `;
            document.querySelector(".files-list").appendChild(el);

            // Adjust chunk size based on file size
            let bufferSize = buffer.length < 1048576 ? 128 * 1024 : 512 * 1024; // 128KB for small files, 512KB for larger files
            shareFile({
                filename: file.name,
                total_buffer_size: buffer.length,
                buffer_size: bufferSize
            }, buffer, el.querySelector(".progress"));
        };
        reader.readAsArrayBuffer(file);
    });

    function shareFile(metadata, buffer, progress_node) {
        console.log("Sharing file with metadata:", metadata);
        let sentChunks = 0; // Track the number of sent chunks
        const totalChunks = Math.ceil(metadata.total_buffer_size / metadata.buffer_size);

        function sendNextChunks(numChunks = 5) { // Send 5 chunks concurrently
            for (let i = 0; i < numChunks; i++) {
                if (sentChunks < totalChunks) {
                    let chunk = buffer.slice(sentChunks * metadata.buffer_size, (sentChunks + 1) * metadata.buffer_size);
                    console.log(`Sending chunk ${sentChunks + 1} of ${totalChunks}`);
                    socket.emit("file-raw", {
                        uid: receiverID,
                        buffer: chunk, // Send the chunk
                        chunkIndex: sentChunks // Send chunk index
                    });
                    sentChunks++;
                    progress_node.innerText = Math.trunc((sentChunks / totalChunks) * 100) + "%"; // Update progress
                }
            }
        }

        socket.emit("file-meta", {
            uid: receiverID,
            metadata: metadata
        });

        socket.on("fs-share", function () {
            sendNextChunks(); // Call to send next chunks
        });

        sendNextChunks(); // Start sending the first chunks
    }

    // Chat functionality
    document.querySelector("#send-chat-btn").addEventListener("click", function() {
        const message = document.querySelector("#chat-input").value;
        if (message) {
            socket.emit("chat-message", { uid: receiverID, message: message });
            document.querySelector("#chat-input").value = ""; // Clear input
            addChatMessage("You: " + message);
        }
    });

    socket.on("chat-message", function(data) {
        addChatMessage("Receiver: " + data.message);
    });

    function addChatMessage(message) {
        const chatBox = document.querySelector("#chat-box");
        const messageElement = document.createElement("p");
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }
})();