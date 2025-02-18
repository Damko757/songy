import ffmpeg from "fluent-ffmpeg";
import { PassThrough, Readable } from "stream";
import { Metadator } from "../Metadata/Metadator.js";
import type { YTDL_DownloadOptions } from "@ybd-project/ytdl-core";
import type { Metadata } from "../../../shared/Entities/Metadata/Metadata.js";

export class Downloader {
  link: string;
  metadator: Metadator;

  constructor(link: string) {
    this.link = link;
    this.metadator = new Metadator(this.link);
  }

  audioStream(
    options: YTDL_DownloadOptions & {
      bitrate?: number;
    } = {}
  ) {
    const self = this;
    const outStream = new PassThrough();

    this.metadator
      .rawMetaData()
      .then((info) => {
        self.metadator
          .getYtDlInstance()
          .downloadFromInfo(info, { quality: "highestaudio", ...options })
          .then((stream) => {
            const reader = stream.getReader();
            ffmpeg()
              .input(
                new Readable({
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
                })
              )
              .audioBitrate(options.bitrate ?? 320)
              .format("mp3")
              .pipe(outStream);
          })
          .catch((e) => {
            console.error(e);
            outStream.emit("error", e);
          });
      })
      .catch((e) => {
        outStream.emit("error", e);
      });

    return outStream;
  }
}
