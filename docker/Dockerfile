# this image is designed to run a user supplied ionic project path
# and was specifically created to run the digilent/waveforms-live github project that requires Ionic 2.2.2

FROM opentechblog/ionic-2.2.2:base
WORKDIR /usr/src/app
EXPOSE 8100 35729
CMD ["ionic", "serve", "8100", "35729"]

#run your local code with
#docker run -ti -v <PATH TO WAVEFORMS-LIVE>:/usr/src/app:rw -p 8100:8100 -p 35729:35729 opentechblog/waveforms-live:latest

# to login interactively (and maybe fix things)
#docker run -ti -v <PATH TO WAVEFORMS-LIVE>:/usr/src/app:rw -p 8100:8100 -p 35729:35729 opentechblog/waveforms-live:latest bash
