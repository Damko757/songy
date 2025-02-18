import { Readable } from "stream";

export const readableStreamToReadable = (readableStream: ReadableStream) => {
  const reader = readableStream.getReader();
  return new Readable({
    async read() {
      // Function to read the chunks asynchronously
      const pushChunk = async () => {
        try {
          const { done, value } = await reader.read();

          if (done) {
            this.push(null); // No more data, signal end of stream
          } else {
            this.push(value); // Push the chunk of data to the Node.js stream
            pushChunk(); // Continue reading
          }
        } catch (err) {
          this.emit("error", err); // Handle any errors
        }
      };

      pushChunk(); // Start reading the chunks
    },
  });
};
