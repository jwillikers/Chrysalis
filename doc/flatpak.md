# How to Build the Development Flatpak

The instructions here describe how to build and update the Chrysalis development Flatpak.

## Build

Install Flatpak Builder.

    sudo apt install flatpak-builder

Clone the Chrysalis repository as necessary.

    git clone https://github.com/keyboardio/Chrysalis.git

Change into the Chrysalis build directory.

    cd Chrysalis/build

Add the Flathub repository as a Flatpak remote.

    flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

Build and install the Flatpak.

    flatpak-builder --user --install --install-deps-from=flathub --force-clean --repo=repo build-dir io.keyboard.Chrysalis.Devel.yaml

Run the Flatpak.

    flatpak run io.keyboard.Chrysalis.Devel

## Update

A list of package source archives and checksums are generated for *all* dependencies.
Ideally, these dependencies will be updated whenever the `yarn.lock` file changes to keep the Flatpak version using the same packages.
The Flatpak Node Generator is used to generate this list of packages from the `yarn.lock` file, which is included directly in the Flatpak manifest.
To generate an updated version of this file, `generated-sources.json`, follow the instructions here.

Make sure to install yarn.

    sudo apt install yarn

Install the packages with yarn.

    yarn install --package-lock-only

Fetch the Flatpak Node Generator Python script.

    wget -L https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/node/flatpak-node-generator.py

Run the script against the `yarn.lock` file as shown here.

    python3 flatpak-node-generator.py --xdg-layout yarn ../yarn.lock
