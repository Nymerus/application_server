FROM node:carbon

RUN apt-get update -y -q
RUN apt-get -y -q install nano curl openssh-client openssh-server sudo

RUN adduser --system --shell /bin/bash --gecos 'git admin' --group --disabled-password --home /home/git git

RUN apt-get -y -q install git-core && apt-get -y -q autoclean && apt-get -y -q autoremove

USER git

ENV HOME=/home/git

WORKDIR $HOME

RUN git clone git://github.com/sitaramc/gitolite
RUN mkdir bin; gitolite/install -ln $HOME/bin
ENV PATH=$PATH:$HOME/bin

RUN gitolite/src/gitolite setup -a git
RUN mkdir ~/.gitolite/keydir
RUN gitolite compile
RUN gitolite trigger POST_COMPILE
RUN rm -rf repositories/gitolite-admin.git
RUN echo 'NoHostAuthenticationForLocalhost yes' >> ~/.ssh/config
RUN git config --global user.email "nymerus@outlook.com"
RUN git config --global user.name "nymerus"
RUN git config --global core.attributesFile "* binary"
RUN echo "include \"*.conf\"\n$(cat $HOME/.gitolite/conf/gitolite.conf)" > $HOME/.gitolite/conf/gitolite.conf
EXPOSE 3000
EXPOSE 22

USER root

ENTRYPOINT chmod -R 777 /home/git/data && cd /home/git/data && su --preserve-environment -l git -c 'yarn && yarn start'
CMD ["/usr/sbin/sshd", "-D"]
